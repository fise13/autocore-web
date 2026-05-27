import {
  FirestoreError,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import {
  isScopedCategoryDocumentId,
  scopedCategoryDocumentId,
  scopedRecordDocumentId,
} from "@/lib/specific/specific-sync-ids";

export type SpecificCategoryEntity = {
  id: string;
  localId: number;
  name: string;
  companyId: string;
};

export type SpecificRecordEntity = {
  id: string;
  categoryId: string;
  categoryLocalId: number;
  rowIndex: number;
  data: Record<string, string>;
  companyId: string;
};

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
            .map((item) => {
              const data = item.data() as Record<string, unknown>;
              const localId = readNumber(data.localId ?? data.id);
              return {
                id: item.id,
                localId,
                name: String(data.name ?? ""),
                companyId: String(data.companyId ?? companyId),
              };
            })
            .filter((item) => item.name.trim().length > 0);

          onData(dedupeCategories(companyId, categories));
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
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

      const localId = nextLocalId(existing);
      const categoryRef = doc(db, "specificCategories", scopedCategoryDocumentId(companyId, localId));
      const payload: SpecificCategoryEntity = {
        id: categoryRef.id,
        localId,
        name: trimmed,
        companyId,
      };

      await setDoc(categoryRef, {
        ...payload,
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
            const records = snapshot.docs.map((item) => {
              const payload = item.data() as Record<string, unknown>;
              const rawData = payload.data;
              const parsedData: Record<string, string> = {};
              if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
                for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
                  parsedData[key] = value == null ? "" : String(value);
                }
              }
              return {
                id: item.id,
                categoryId: String(payload.categoryId ?? scopedCategoryDocumentId(companyId, localId)),
                categoryLocalId: readNumber(payload.categoryLocalId ?? localId),
                rowIndex: readNumber(payload.rowIndex),
                data: parsedData,
                companyId: String(payload.companyId ?? companyId),
              };
            });
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
          const records = snapshot.docs.map((item) => {
            const payload = item.data() as Record<string, unknown>;
            const rawData = payload.data;
            const parsedData: Record<string, string> = {};
            if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
              for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
                parsedData[key] = value == null ? "" : String(value);
              }
            }
            return {
              id: item.id,
              categoryId: String(payload.categoryId ?? ""),
              categoryLocalId: readNumber(payload.categoryLocalId),
              rowIndex: readNumber(payload.rowIndex),
              data: parsedData,
              companyId: String(payload.companyId ?? companyId),
            };
          });
          onData(records.sort((a, b) => a.rowIndex - b.rowIndex || a.id.localeCompare(b.id)));
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },
  };
}
