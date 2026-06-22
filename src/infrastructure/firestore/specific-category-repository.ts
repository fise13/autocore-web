import {
  FirestoreError,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  SpecificCategoryEntity,
  SpecificColumnDef,
  SpecificRecordEntity,
} from "@/domain/specific-category";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import {
  createDefaultColumnSchema,
  normalizeColumnSchema,
} from "@/lib/specific/specific-category-schema";
import {
  isScopedCategoryDocumentId,
  scopedCategoryDocumentId,
  scopedRecordDocumentId,
} from "@/lib/specific/specific-sync-ids";

export type { SpecificCategoryEntity, SpecificColumnDef, SpecificRecordEntity };

const BATCH_SIZE = 400;

function mapCategory(
  id: string,
  data: Record<string, unknown>,
  companyId: string,
): SpecificCategoryEntity {
  const localId = readNumber(data.localId ?? data.id);
  const rawSchema = data.columnSchema;
  const columnSchema =
    Array.isArray(rawSchema) && rawSchema.length > 0
      ? normalizeColumnSchema(rawSchema as SpecificColumnDef[])
      : [];

  return {
    id,
    localId,
    name: String(data.name ?? ""),
    companyId: String(data.companyId ?? companyId),
    columnSchema,
  };
}

function mapRecord(
  id: string,
  payload: Record<string, unknown>,
  companyId: string,
  fallbackCategoryId?: string,
  fallbackLocalId?: number,
): SpecificRecordEntity {
  const rawData = payload.data;
  const parsedData: Record<string, string> = {};
  if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
    for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
      parsedData[key] = value == null ? "" : String(value);
    }
  }

  const categoryLocalId = readNumber(payload.categoryLocalId ?? fallbackLocalId);
  return {
    id,
    categoryId: String(
      payload.categoryId ?? fallbackCategoryId ?? scopedCategoryDocumentId(companyId, categoryLocalId),
    ),
    categoryLocalId,
    rowIndex: readNumber(payload.rowIndex),
    data: parsedData,
    companyId: String(payload.companyId ?? companyId),
  };
}

function readNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nextLocalId(items: { localId: number }[]): number {
  const max = items.reduce((acc, item) => Math.max(acc, item.localId), 0);
  return max + 1;
}

function dedupeCategories(
  companyId: string,
  categories: SpecificCategoryEntity[],
): SpecificCategoryEntity[] {
  const groups = new Map<string, SpecificCategoryEntity[]>();
  for (const category of categories) {
    const key = category.name.trim().toLocaleLowerCase("ru");
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), category]);
  }

  const result: SpecificCategoryEntity[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const scoped = group.find((item) => isScopedCategoryDocumentId(companyId, item.id));
    const canonical =
      scoped ??
      [...group].sort((left, right) => {
        if (left.localId !== right.localId) return left.localId - right.localId;
        return left.id.localeCompare(right.id);
      })[0];

    result.push({
      ...canonical,
      id: scopedCategoryDocumentId(companyId, canonical.localId),
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function relatedCategoryLocalIds(
  category: SpecificCategoryEntity,
  categories: SpecificCategoryEntity[],
): number[] {
  const key = category.name.trim().toLocaleLowerCase("ru");
  const ids = categories
    .filter((item) => item.name.trim().toLocaleLowerCase("ru") === key)
    .map((item) => item.localId)
    .filter((item) => item > 0);
  return [...new Set(ids.length > 0 ? ids : [category.localId])];
}

export type SpecificCategoryRepository = ReturnType<typeof createSpecificCategoryRepository>;

export function createSpecificCategoryRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();

  return {
    async fetchCategories(companyId: string): Promise<SpecificCategoryEntity[]> {
      const categoriesQuery = query(
        collection(db, "specificCategories"),
        where("companyId", "==", companyId),
      );
      const snapshot = await getDocs(categoriesQuery);
      const categories = snapshot.docs
        .map((item) => mapCategory(item.id, item.data() as Record<string, unknown>, companyId))
        .filter((item) => item.name.trim().length > 0);
      return dedupeCategories(companyId, categories);
    },

    subscribeCategories(
      companyId: string,
      onData: (categories: SpecificCategoryEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const categoriesQuery = query(
        collection(db, "specificCategories"),
        where("companyId", "==", companyId),
      );

      return onSnapshot(
        categoriesQuery,
        (snapshot) => {
          const categories = snapshot.docs
            .map((item) => mapCategory(item.id, item.data() as Record<string, unknown>, companyId))
            .filter((item) => item.name.trim().length > 0);

          onData(dedupeCategories(companyId, categories));
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async createCategory(
      companyId: string,
      name: string,
      existing: SpecificCategoryEntity[],
      actorUid?: string,
      columnSchema: SpecificColumnDef[] = createDefaultColumnSchema(),
    ): Promise<SpecificCategoryEntity> {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Название листа не может быть пустым");

      const duplicate = existing.find(
        (item) => item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
      );
      if (duplicate) {
        throw new Error(`Лист «${trimmed}» уже существует`);
      }

      const localId = nextLocalId(existing);
      const categoryRef = doc(db, "specificCategories", scopedCategoryDocumentId(companyId, localId));
      const payload: SpecificCategoryEntity = {
        id: categoryRef.id,
        localId,
        name: trimmed,
        companyId,
        columnSchema: normalizeColumnSchema(columnSchema),
      };

      await setDoc(categoryRef, {
        companyId,
        localId,
        name: trimmed,
        columnSchema: payload.columnSchema,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (actorUid) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.specific_category_created",
          target: `specificCategory:${payload.id}`,
        });
      }

      return payload;
    },

    async updateCategory(
      companyId: string,
      category: SpecificCategoryEntity,
      patch: Partial<Pick<SpecificCategoryEntity, "name" | "columnSchema">>,
    ): Promise<SpecificCategoryEntity> {
      const canonicalId = scopedCategoryDocumentId(companyId, category.localId);
      const categoryRef = doc(db, "specificCategories", canonicalId);
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (patch.name != null) updatePayload.name = patch.name.trim();
      if (patch.columnSchema != null) {
        updatePayload.columnSchema = normalizeColumnSchema(patch.columnSchema);
      }
      await updateDoc(categoryRef, updatePayload);

      return {
        ...category,
        id: canonicalId,
        name: patch.name?.trim() ?? category.name,
        columnSchema: patch.columnSchema
          ? normalizeColumnSchema(patch.columnSchema)
          : category.columnSchema,
      };
    },

    async deleteCategory(companyId: string, category: SpecificCategoryEntity, actorUid?: string) {
      await this.deleteRecordsForCategory(companyId, category);
      const canonicalId = scopedCategoryDocumentId(companyId, category.localId);
      await deleteDoc(doc(db, "specificCategories", canonicalId));
      if (actorUid) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.specific_category_deleted",
          target: `specificCategory:${canonicalId}`,
        });
      }
    },

    async deleteRecord(recordId: string, actorUid?: string, companyId?: string) {
      await deleteDoc(doc(db, "specificRecords", recordId));
      if (actorUid && companyId) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.specific_record_deleted",
          target: `specificRecord:${recordId}`,
        });
      }
    },

    async deleteRecordsForCategory(companyId: string, category: SpecificCategoryEntity) {
      const localIds = [category.localId];
      const existingQuery = query(
        collection(db, "specificRecords"),
        where("companyId", "==", companyId),
        where("categoryLocalId", "in", localIds.slice(0, 30)),
      );
      const existingSnap = await getDocs(existingQuery);
      for (let index = 0; index < existingSnap.docs.length; index += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = existingSnap.docs.slice(index, index + BATCH_SIZE);
        for (const item of chunk) {
          batch.delete(item.ref);
        }
        await batch.commit();
      }
    },

    async batchUpdateRecordDataKeys(
      companyId: string,
      category: SpecificCategoryEntity,
      ops: {
        rename?: Array<{ oldKey: string; newKey: string }>;
        remove?: string[];
      },
    ) {
      const localIds = [category.localId];
      const existingQuery = query(
        collection(db, "specificRecords"),
        where("companyId", "==", companyId),
        where("categoryLocalId", "in", localIds.slice(0, 30)),
      );
      const existingSnap = await getDocs(existingQuery);

      for (let index = 0; index < existingSnap.docs.length; index += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = existingSnap.docs.slice(index, index + BATCH_SIZE);

        for (const item of chunk) {
          const payload = item.data() as Record<string, unknown>;
          const record = mapRecord(item.id, payload, companyId, category.id, category.localId);
          let nextData = { ...record.data };

          for (const rename of ops.rename ?? []) {
            if (rename.oldKey === rename.newKey || !(rename.oldKey in nextData)) continue;
            nextData[rename.newKey] = nextData[rename.oldKey] ?? "";
            delete nextData[rename.oldKey];
          }
          for (const key of ops.remove ?? []) {
            if (key in nextData) delete nextData[key];
          }

          batch.update(item.ref, {
            data: nextData,
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      }
    },

    async upsertCategory(
      companyId: string,
      name: string,
      existing: SpecificCategoryEntity[],
      actorUid?: string,
    ): Promise<SpecificCategoryEntity> {
      const trimmed = name.trim();
      const match = existing.find(
        (item) => item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
      );
      if (match) {
        const canonicalId = scopedCategoryDocumentId(companyId, match.localId);
        if (match.id !== canonicalId) {
          await setDoc(
            doc(db, "specificCategories", canonicalId),
            {
              companyId,
              localId: match.localId,
              name: match.name,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
        return { ...match, id: canonicalId };
      }

      throw new Error(`Лист «${trimmed}» не найден. Создайте его в сайдбаре «Специфичные».`);
    },

    async findCategoryByName(
      companyId: string,
      name: string,
      existing: SpecificCategoryEntity[],
    ): Promise<SpecificCategoryEntity | null> {
      const trimmed = name.trim();
      const match = existing.find(
        (item) => item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
      );
      if (!match) return null;
      const canonicalId = scopedCategoryDocumentId(companyId, match.localId);
      return { ...match, id: canonicalId };
    },

    async replaceRecordsForCategory(
      companyId: string,
      category: SpecificCategoryEntity,
      rows: Array<{ rowIndex: number; data: Record<string, string> }>,
      actorUid?: string,
    ) {
      const canonicalCategoryId = scopedCategoryDocumentId(companyId, category.localId);
      const localIds = [category.localId];
      const existingQuery = query(
        collection(db, "specificRecords"),
        where("companyId", "==", companyId),
        where("categoryLocalId", "in", localIds.slice(0, 30)),
      );
      const existingSnap = await getDocs(existingQuery);

      const batch = writeBatch(db);
      const keepIds = new Set<string>();
      for (const row of rows) {
        keepIds.add(scopedRecordDocumentId(companyId, category.localId, row.rowIndex));
      }

      for (const item of existingSnap.docs) {
        if (!keepIds.has(item.id)) {
          batch.delete(item.ref);
        }
      }

      for (const row of rows) {
        const recordRef = doc(
          db,
          "specificRecords",
          scopedRecordDocumentId(companyId, category.localId, row.rowIndex),
        );
        batch.set(recordRef, {
          companyId,
          categoryId: canonicalCategoryId,
          categoryLocalId: category.localId,
          rowIndex: row.rowIndex,
          data: row.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      if (actorUid) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.specific_records_replaced",
          target: `specificCategory:${canonicalCategoryId}`,
          metadata: { rows: rows.length },
        });
      }
    },

    async upsertRecord(
      companyId: string,
      category: SpecificCategoryEntity,
      rowIndex: number,
      data: Record<string, string>,
      actorUid?: string,
    ) {
      const canonicalCategoryId = scopedCategoryDocumentId(companyId, category.localId);
      const recordRef = doc(
        db,
        "specificRecords",
        scopedRecordDocumentId(companyId, category.localId, rowIndex),
      );
      await setDoc(
        recordRef,
        {
          companyId,
          categoryId: canonicalCategoryId,
          categoryLocalId: category.localId,
          rowIndex,
          data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      if (actorUid) {
        await activity.append(companyId, {
          actor: actorUid,
          action: "inventory.specific_record_upserted",
          target: `specificRecord:${recordRef.id}`,
        });
      }
    },

    subscribeRecords(
      companyId: string,
      category: SpecificCategoryEntity,
      allCategories: SpecificCategoryEntity[],
      onData: (records: SpecificRecordEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const localIds = relatedCategoryLocalIds(category, allCategories);
      const unsubscribes: Array<() => void> = [];
      const recordsByLocalId = new Map<number, SpecificRecordEntity[]>();

      const emit = () => {
        const merged = [...recordsByLocalId.values()]
          .flat()
          .sort((a, b) => a.rowIndex - b.rowIndex || a.id.localeCompare(b.id));
        const deduped = new Map<string, SpecificRecordEntity>();
        for (const record of merged) {
          const key = `${record.categoryLocalId}:${record.rowIndex}`;
          const existing = deduped.get(key);
          if (!existing) {
            deduped.set(key, record);
            continue;
          }
          const preferExisting = isScopedCategoryDocumentId(companyId, existing.categoryId);
          const preferIncoming = isScopedCategoryDocumentId(companyId, record.categoryId);
          if (!preferExisting && preferIncoming) {
            deduped.set(key, record);
          }
        }
        onData([...deduped.values()].sort((a, b) => a.rowIndex - b.rowIndex));
      };

      for (const localId of localIds) {
        const recordsQuery = query(
          collection(db, "specificRecords"),
          where("companyId", "==", companyId),
          where("categoryLocalId", "==", localId),
        );

        const unsubscribe = onSnapshot(
          recordsQuery,
          (snapshot) => {
            const records = snapshot.docs.map((item) =>
              mapRecord(
                item.id,
                item.data() as Record<string, unknown>,
                companyId,
                scopedCategoryDocumentId(companyId, localId),
                localId,
              ),
            );
            recordsByLocalId.set(localId, records);
            emit();
          },
          (error) => notifyFirestoreSnapshotError(error, onError),
        );
        unsubscribes.push(unsubscribe);
      }

      return () => {
        for (const unsubscribe of unsubscribes) unsubscribe();
      };
    },

    subscribeAllRecords(
      companyId: string,
      onData: (records: SpecificRecordEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const recordsQuery = query(
        collection(db, "specificRecords"),
        where("companyId", "==", companyId),
      );

      return onSnapshot(
        recordsQuery,
        (snapshot) => {
          const records = snapshot.docs.map((item) =>
            mapRecord(item.id, item.data() as Record<string, unknown>, companyId),
          );
          onData(records.sort((a, b) => a.rowIndex - b.rowIndex || a.id.localeCompare(b.id)));
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },
  };
}
