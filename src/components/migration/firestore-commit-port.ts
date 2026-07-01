"use client";

import { collection, getDocs } from "firebase/firestore";

import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { receiveStockUseCase } from "@/application/use-cases/warehouse/receive-stock";
import { upsertInventoryItemUseCase } from "@/application/use-cases/warehouse/upsert-inventory-item";
import type { MotorEntity } from "@/domain/motor";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createInventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { createInventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import {
  createMotorRepository,
  generateWebLocalId,
} from "@/infrastructure/firestore/motor-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import {
  buildInventoryInputFromMigrationRow,
  buildMotorInputFromMigrationRow,
} from "@/lib/import/migration-row-builders";
import { RECORD_TYPE_LABELS, type RecordType } from "@/lib/import";

import type {
  DuplicateGroup,
  MigrationCommitInput,
  MigrationCommitPort,
  MigrationProgress,
  MigrationResult,
  MigrationStage,
  ReviewRow,
} from "./migration-types";

const CHUNK_SIZE = 40;

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const itemRepository = createInventoryItemRepository();
const stockLevelRepository = createInventoryStockLevelRepository();
const movementRepository = createInventoryMovementRepository();
const warehouseRepository = createWarehouseRepository();
const financialRepository = createFinancialOperationRepository();
const motorRepository = createMotorRepository();

type StageKey = "prepare" | "records" | "photos" | "index" | "finish";

const STAGE_META: Array<{ key: StageKey; label: string }> = [
  { key: "prepare", label: "Подготовка" },
  { key: "records", label: "Импорт записей" },
  { key: "photos", label: "Привязка фото" },
  { key: "index", label: "Обновление поискового индекса" },
  { key: "finish", label: "Завершение" },
];

function summarize(stages: MigrationStage[]): MigrationProgress {
  const total = stages.reduce((sum, stage) => sum + stage.total, 0);
  const done = stages.reduce((sum, stage) => sum + stage.done, 0);
  const active = stages.find((stage) => stage.done < stage.total);
  return {
    stages,
    percent: total === 0 ? 1 : done / total,
    activeStageKey: active?.key ?? null,
  };
}

function buildStages(rows: ReviewRow[]): MigrationStage[] {
  const pending = rows.filter((row) => row.status === "pending");
  const withPhotos = pending.filter((row) => row.photo).length;
  return STAGE_META.map(({ key, label }) => {
    if (key === "prepare") return { key, label, total: 1, done: 0 };
    if (key === "records") return { key, label, total: pending.length, done: 0 };
    if (key === "photos") return { key, label, total: withPhotos, done: 0 };
    if (key === "index") return { key, label, total: pending.length, done: 0 };
    return { key, label, total: 1, done: 0 };
  });
}

async function loadExistingMotors(uid: string): Promise<MotorEntity[]> {
  const db = getFirestoreDb();
  const snapshot = await getDocs(collection(db, "users", uid, "motors"));
  const motors: MotorEntity[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const serialCode = String(data.serialCode ?? "").trim();
    const localId = Number(data.localId ?? docSnap.id);
    if (!serialCode && !Number.isFinite(localId)) continue;
    motors.push({
      id: String(Number.isFinite(localId) ? localId : docSnap.id),
      companyId: String(data.companyId ?? ""),
      localId: Number.isFinite(localId) ? localId : undefined,
      serialCode,
      configuration: String(data.configuration ?? ""),
      notes: String(data.notes ?? ""),
      quantity: Number(data.quantity ?? 1),
      transmission: String(data.transmission ?? ""),
      arrivalDate: null,
    });
  }
  return motors;
}

function motorIndexBySerial(motors: MotorEntity[]): Map<string, MotorEntity> {
  const map = new Map<string, MotorEntity>();
  for (const motor of motors) {
    const key = motor.serialCode.trim().toLowerCase();
    if (key) map.set(key, motor);
  }
  return map;
}

function shouldSkipDuplicate(row: ReviewRow, duplicates: DuplicateGroup[]): boolean {
  for (const group of duplicates) {
    if (!group.rowIds.includes(row.id)) continue;
    if (group.resolution === "skip") return true;
  }
  return false;
}

function shouldUpdateDuplicate(row: ReviewRow, duplicates: DuplicateGroup[]): boolean {
  for (const group of duplicates) {
    if (!group.rowIds.includes(row.id)) continue;
    if (group.resolution === "update") return true;
  }
  return false;
}

export function createFirestoreCommitPort(uid: string): MigrationCommitPort {
  return {
    canUndo: false,
    async commit(input, onProgress, shouldCancel): Promise<MigrationResult> {
      if (!input.companyId) {
        throw new Error("Компания не выбрана");
      }

      const companyId = input.companyId;
      const stages = buildStages(input.rows);
      onProgress(summarize(stages));

      const prepareStage = stages.find((stage) => stage.key === "prepare")!;
      const recordsStage = stages.find((stage) => stage.key === "records")!;
      const photosStage = stages.find((stage) => stage.key === "photos")!;
      const indexStage = stages.find((stage) => stage.key === "index")!;
      const finishStage = stages.find((stage) => stage.key === "finish")!;

      try {
        const warehouse = await ensureDefaultWarehouseUseCase(warehouseRepository, companyId, uid);
        if (!warehouse) {
          throw new Error("Не удалось подготовить склад. Проверьте доступ к компании и попробуйте снова.");
        }

        prepareStage.done = 1;
        onProgress(summarize(stages));

        const motorCache: MotorCache = { motors: null, bySerial: new Map() };
        const skuCache = new Map<string, string>();
        const counts = new Map<RecordType, number>();
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        const pending = input.rows.filter((row) => row.status === "pending");

        for (let offset = 0; offset < pending.length; offset += CHUNK_SIZE) {
          if (shouldCancel?.()) break;
          const chunk = pending.slice(offset, offset + CHUNK_SIZE);

          for (const row of chunk) {
            if (shouldCancel?.()) break;
            if (shouldSkipDuplicate(row, input.duplicates)) {
              skipped += 1;
              recordsStage.done += 1;
              if (row.photo) photosStage.done += 1;
              indexStage.done += 1;
              continue;
            }

            try {
              const imported = await persistRow({
                uid,
                companyId,
                row,
                warehouseId: warehouse.id,
                motorCache,
                skuCache,
                updateExisting: shouldUpdateDuplicate(row, input.duplicates),
              });

              if (imported.updated) updated += 1;
              else if (imported.created) {
                counts.set(row.recordType, (counts.get(row.recordType) ?? 0) + 1);
              }

              recordsStage.done += 1;
              if (row.photo) photosStage.done += 1;
              indexStage.done += 1;
            } catch {
              errors += 1;
              recordsStage.done += 1;
              if (row.photo) photosStage.done += 1;
              indexStage.done += 1;
            }
          }

          onProgress(summarize(stages));
          await yieldToUi();
        }

        finishStage.done = 1;
        onProgress(summarize(stages));

        const imported = [...counts.entries()]
          .filter(([type]) => type !== "unknown")
          .map(([type, count]) => ({ type, label: RECORD_TYPE_LABELS[type], count }))
          .sort((a, b) => b.count - a.count);

        const needsReview = pending.filter((row) => row.confidence.tier !== "high").length;

        if (shouldCancel?.()) {
          throw new Error("Импорт отменён. Уже перенесённые позиции остались в AutoCore.");
        }

        return {
          imported,
          updated,
          skipped: skipped + input.rows.filter((row) => row.status === "skipped").length,
          needsReview,
          errors,
          reportRows: input.rows,
        };
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("Не удалось сохранить данные в AutoCore. Попробуйте ещё раз.");
      }
    },
  };
}

async function persistRow(params: {
  uid: string;
  companyId: string;
  row: ReviewRow;
  warehouseId: string;
  motorCache: MotorCache;
  skuCache: Map<string, string>;
  updateExisting: boolean;
}): Promise<{ created: boolean; updated: boolean }> {
  const { uid, companyId, row, warehouseId, motorCache, skuCache, updateExisting } = params;
  const photoPath = row.photo?.path;

  if (row.target === "motor" || row.recordType === "engine") {
    await ensureMotorsLoaded(uid, motorCache);
    const { motors, bySerial } = motorCache;
    const existingMotors = motors!;

    const motorInput = buildMotorInputFromMigrationRow(row.values, companyId, photoPath);
    if (!motorInput) return { created: false, updated: false };

    const serialKey = motorInput.serialCode.trim().toLowerCase();
    const existing = serialKey ? bySerial.get(serialKey) : undefined;

    if (existing && updateExisting) {
      await motorRepository.upsert(uid, existing.id, {
        ...motorInput,
        localId: existing.localId ?? Number(existing.id),
      });
      return { created: false, updated: true };
    }

    if (existing && !updateExisting) {
      const localId = generateWebLocalId(existingMotors);
      await motorRepository.create(uid, { ...motorInput, localId }, existingMotors);
      const createdMotor: MotorEntity = {
        id: String(localId),
        companyId,
        localId,
        serialCode: motorInput.serialCode,
        configuration: motorInput.configuration ?? "",
        notes: motorInput.notes ?? "",
        quantity: motorInput.quantity ?? 1,
        transmission: "",
        arrivalDate: null,
      };
      motorCache.motors = [...existingMotors, createdMotor];
      bySerial.set(serialKey, createdMotor);
      return { created: true, updated: false };
    }

    await motorRepository.create(uid, motorInput, existingMotors);
    return { created: true, updated: false };
  }

  if (row.recordType === "donorCar") {
    return { created: false, updated: false };
  }

  const inventoryInput = buildInventoryInputFromMigrationRow(
    row.values,
    companyId,
    row.recordType,
    row.id,
    uid,
    photoPath,
  );
  if (!inventoryInput) {
    return { created: false, updated: false };
  }

  const skuKey = inventoryInput.sku.trim().toLowerCase();
  const cachedItemId = skuCache.get(skuKey);
  const existingItem = cachedItemId
    ? { id: cachedItemId }
    : await itemRepository.findBySku(companyId, inventoryInput.sku);

  let itemId: string | undefined;

  if (existingItem && updateExisting) {
    itemId = await upsertInventoryItemUseCase(itemRepository, inventoryInput, existingItem.id);
    skuCache.set(skuKey, itemId);
    await receiveStockForRow(uid, companyId, row, warehouseId, itemId, inventoryInput.purchasePrice);
    return { created: false, updated: true };
  }

  if (existingItem && !updateExisting) {
    const altSku = `${inventoryInput.sku}-${row.id.replace(":", "-")}`.slice(0, 80);
    itemId = await upsertInventoryItemUseCase(itemRepository, { ...inventoryInput, sku: altSku });
    skuCache.set(altSku.trim().toLowerCase(), itemId);
  } else {
    try {
      itemId = await upsertInventoryItemUseCase(itemRepository, inventoryInput);
      skuCache.set(skuKey, itemId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("уже существует")) {
        const altSku = `${inventoryInput.sku}-${row.id.replace(":", "-")}`.slice(0, 80);
        itemId = await upsertInventoryItemUseCase(itemRepository, { ...inventoryInput, sku: altSku });
        skuCache.set(altSku.trim().toLowerCase(), itemId);
      } else {
        throw error;
      }
    }
  }

  await receiveStockForRow(uid, companyId, row, warehouseId, itemId!, inventoryInput.purchasePrice);
  return { created: true, updated: false };
}

type MotorCache = {
  motors: MotorEntity[] | null;
  bySerial: Map<string, MotorEntity>;
};

async function ensureMotorsLoaded(uid: string, cache: MotorCache): Promise<void> {
  if (cache.motors) return;
  cache.motors = await loadExistingMotors(uid);
  cache.bySerial = motorIndexBySerial(cache.motors);
}

async function receiveStockForRow(
  uid: string,
  companyId: string,
  row: ReviewRow,
  warehouseId: string,
  itemId: string,
  unitCost?: number,
): Promise<void> {
  const qty = parseQuantity(row.values.quantity);
  if (qty <= 0) return;

  await receiveStockUseCase(
    itemRepository,
    stockLevelRepository,
    movementRepository,
    warehouseRepository,
    financialRepository,
    {
      companyId,
      itemId,
      warehouseId,
      quantity: qty,
      unitCost,
      actorUserId: uid,
      referenceType: "import",
      idempotencyKey: `migration:${companyId}:${row.id}`,
    },
  );
}

function parseQuantity(raw: string | undefined): number {
  if (!raw?.trim()) return 1;
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}
