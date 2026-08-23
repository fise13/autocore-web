import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { ImportSuggestedRow } from "@/domain/import-batch";
import type { MotorEntity } from "@/domain/motor";
import { upsertMotorSchema } from "@/domain/schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  getImportBatchAdmin,
  listImportSuggestedRowsAdmin,
  updateImportBatchAdmin,
  updateSuggestedRowAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { ensureDefaultWarehouseAdmin } from "@/lib/warehouse/ensure-default-warehouse.server";
import { upsertInventoryItemSchema } from "@/domain/schemas";
import { buildInventorySearchTokens } from "@/lib/warehouse/warehouse-search";
import { applyMovementToStock, computeAvailable } from "@/lib/warehouse/movement-logic";
import { stockLevelDocumentId } from "@/lib/warehouse/warehouse-sync-ids";

function generateWebLocalId(existingMotors: MotorEntity[]): number {
  const used = new Set(
    existingMotors
      .map((motor) => motor.localId ?? Number(motor.id))
      .filter((value) => Number.isFinite(value)),
  );
  let candidate = -Math.floor(Date.now() % 2_000_000_000);
  while (used.has(candidate)) candidate -= 1;
  return candidate;
}

async function listUserMotors(uid: string): Promise<MotorEntity[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("users").doc(uid).collection("motors").get();
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
      brandName: typeof data.brandName === "string" ? data.brandName : "",
      engineCode: typeof data.engineCode === "string" ? data.engineCode : "",
    });
  }
  return motors;
}

function resolveSerial(row: ImportSuggestedRow, index: number): string {
  const serial = row.serialCode.trim();
  if (serial) return serial;
  return `AUTO-IMP-${Date.now().toString(36).toUpperCase()}-${index + 1}`;
}

async function commitImportBatchWarehouse(params: {
  companyId: string;
  uid: string;
  batchId: string;
  rowIds?: string[];
}): Promise<{ imported: number; motorIds: string[]; itemIds: string[] }> {
  const batch = await getImportBatchAdmin(params.companyId, params.batchId);
  if (!batch) throw new Error("Import not found");
  if (batch.status === "completed") {
    return {
      imported: batch.appliedMotorIds?.length ?? 0,
      motorIds: [],
      itemIds: batch.appliedMotorIds ?? [],
    };
  }

  await updateImportBatchAdmin(params.batchId, { status: "applying", error: null });

  try {
    const allRows = await listImportSuggestedRowsAdmin(params.batchId);
    const selected = allRows.filter((row) => {
      if (params.rowIds?.length) return params.rowIds.includes(row.id) && row.selected;
      return row.selected;
    });
    if (selected.length === 0) {
      await updateImportBatchAdmin(params.batchId, { status: "review", error: "Нет выбранных строк" });
      throw new Error("Select at least one row");
    }

    const companyId = normalizeCompanyId(params.companyId);
    const warehouseId = await ensureDefaultWarehouseAdmin(companyId);
    const db = getAdminFirestore();
    const itemIds: string[] = [];

    for (let index = 0; index < selected.length; index += 1) {
      const row = selected[index]!;
      const sku =
        row.serialCode.trim() ||
        row.engineCode.trim() ||
        `IMP-${params.batchId.slice(0, 6)}-${index + 1}`;
      const name =
        [row.brandName, row.engineCode, row.serialCode].filter(Boolean).join(" ") ||
        row.summary ||
        sku;

      const validated = upsertInventoryItemSchema.parse({
        companyId,
        sku,
        name,
        brandName: row.brandName || undefined,
        notes: [row.notes, row.compatibility].filter(Boolean).join("\n") || undefined,
        purchasePrice: row.price ?? undefined,
        actorUserId: params.uid,
        type: "generic",
        inventoryGroup: "consumables",
      });

      const searchTokens = buildInventorySearchTokens({
        companyId: validated.companyId,
        sku: validated.sku,
        name: validated.name,
        type: validated.type ?? "generic",
        barcodes: validated.barcodes ?? [],
        brandName: validated.brandName,
        notes: validated.notes,
        inventoryGroup: "consumables",
      } as Parameters<typeof buildInventorySearchTokens>[0]);

      const created = await db.collection("inventoryItems").add({
        companyId,
        type: validated.type ?? "generic",
        sku: validated.sku.trim(),
        name: validated.name.trim(),
        barcodes: [],
        unit: "pcs",
        currency: "USD",
        status: "active",
        inventoryGroup: "consumables",
        brandName: validated.brandName ?? null,
        notes: validated.notes ?? null,
        purchasePrice: validated.purchasePrice ?? null,
        searchTokens,
        totalOnHand: 0,
        totalReserved: 0,
        totalAvailable: 0,
        stockValue: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdByUserId: params.uid,
        importBatchId: params.batchId,
      });

      const qty = row.quantity || 1;
      const unitCost = typeof row.price === "number" ? row.price : 0;
      const stockRef = db
        .collection("inventoryStockLevels")
        .doc(stockLevelDocumentId(created.id, warehouseId));
      const movementRef = db.collection("inventoryMovements").doc();

      await db.runTransaction(async (transaction) => {
        const stockSnap = await transaction.get(stockRef);
        const itemRef = db.collection("inventoryItems").doc(created.id);
        const prevOnHand = Number(stockSnap.data()?.onHand ?? 0);
        const prevReserved = Number(stockSnap.data()?.reserved ?? 0);
        const prevAvailable = computeAvailable(prevOnHand, prevReserved);
        const { next } = applyMovementToStock(
          { onHand: prevOnHand, reserved: prevReserved, available: prevAvailable },
          "receipt",
          qty,
        );
        transaction.set(
          stockRef,
          {
            companyId,
            itemId: created.id,
            warehouseId,
            onHand: next.onHand,
            reserved: next.reserved,
            available: computeAvailable(next.onHand, next.reserved),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(movementRef, {
          companyId,
          itemId: created.id,
          warehouseId,
          type: "receipt",
          quantity: qty,
          unitCost,
          actorUserId: params.uid,
          idempotencyKey: `import-batch:${params.batchId}:${row.id}`,
          createdAt: FieldValue.serverTimestamp(),
        });
        transaction.update(itemRef, {
          totalOnHand: next.onHand,
          totalReserved: next.reserved,
          totalAvailable: computeAvailable(next.onHand, next.reserved),
          stockValue: next.onHand * unitCost,
          averageCost: unitCost,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      itemIds.push(created.id);
    }

    await updateImportBatchAdmin(params.batchId, {
      status: "completed",
      aiStatus: "done",
      appliedMotorIds: itemIds,
      error: null,
      counts: { ...batch.counts, rowsAccepted: itemIds.length },
    });

    return { imported: itemIds.length, motorIds: [], itemIds };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка импорта";
    await updateImportBatchAdmin(params.batchId, { status: "failed", error: message });
    throw error;
  }
}

export async function commitImportBatchMotors(params: {
  companyId: string;
  uid: string;
  batchId: string;
  rowIds?: string[];
}): Promise<{ imported: number; motorIds: string[]; itemIds?: string[] }> {
  const batch = await getImportBatchAdmin(params.companyId, params.batchId);
  if (!batch) throw new Error("Import not found");
  if (batch.target === "warehouse") {
    return commitImportBatchWarehouse(params);
  }
  if (batch.status === "completed") {
    return { imported: batch.appliedMotorIds?.length ?? 0, motorIds: batch.appliedMotorIds ?? [] };
  }
  if (batch.status === "applying") throw new Error("This import is already being committed");

  await updateImportBatchAdmin(params.batchId, { status: "applying", error: null });

  try {
    const allRows = await listImportSuggestedRowsAdmin(params.batchId);
    const selected = allRows.filter((row) => {
      if (params.rowIds?.length) return params.rowIds.includes(row.id) && row.selected;
      return row.selected;
    });

    if (selected.length === 0) {
      await updateImportBatchAdmin(params.batchId, {
        status: "review",
        error: "Нет выбранных строк",
      });
      throw new Error("Select at least one row");
    }

    const companyId = normalizeCompanyId(params.companyId);
    const existingMotors = await listUserMotors(params.uid);
    const motorsBySerial = new Map(
      existingMotors
        .filter((m) => m.serialCode.trim())
        .map((m) => [m.serialCode.trim().toLowerCase(), m] as const),
    );

    const db = getAdminFirestore();
    const motorIds: string[] = [];
    let imported = 0;

    for (let index = 0; index < selected.length; index += 1) {
      const row = selected[index]!;
      const serialCode = resolveSerial(row, index);
      const validated = upsertMotorSchema.parse({
        companyId,
        serialCode,
        configuration: row.configuration || "",
        notes: [row.notes, row.compatibility, row.vin ? `VIN: ${row.vin}` : ""]
          .filter(Boolean)
          .join("\n"),
        quantity: row.quantity || 1,
        transmission: row.transmission || "",
        brandName: row.brandName || "Не указан",
        engineCode: row.engineCode || "—",
        arrivalDate: new Date(),
        status: "available",
      });

      const serialKey = validated.serialCode.trim().toLowerCase();
      if (serialKey && motorsBySerial.has(serialKey)) {
        await updateSuggestedRowAdmin(params.batchId, row.id, {
          warnings: [...row.warnings, "Дубликат серийного номера — пропущено"],
          selected: false,
        });
        continue;
      }

      const localId = generateWebLocalId(existingMotors);
      await db
        .collection("users")
        .doc(params.uid)
        .collection("motors")
        .doc(String(localId))
        .set(
          {
            companyId,
            localId,
            serialCode: validated.serialCode,
            configuration: validated.configuration ?? "",
            notes: validated.notes ?? "",
            quantity: validated.quantity ?? 1,
            transmission: validated.transmission ?? "",
            brandName: validated.brandName ?? "Не указан",
            engineCode: validated.engineCode ?? "—",
            status: "available",
            arrivalDate: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            importBatchId: params.batchId,
            importRowId: row.id,
            ...(typeof row.price === "number" ? { importPrice: row.price } : {}),
          },
          { merge: true },
        );

      const created: MotorEntity = {
        id: String(localId),
        companyId,
        localId,
        serialCode: validated.serialCode,
        configuration: validated.configuration ?? "",
        notes: validated.notes ?? "",
        quantity: validated.quantity ?? 1,
        transmission: validated.transmission ?? "",
        arrivalDate: new Date(),
        brandName: validated.brandName,
        engineCode: validated.engineCode,
      };
      existingMotors.push(created);
      if (serialKey) motorsBySerial.set(serialKey, created);
      motorIds.push(String(localId));
      imported += 1;
    }

    await updateImportBatchAdmin(params.batchId, {
      status: "completed",
      aiStatus: "done",
      appliedMotorIds: motorIds,
      error: null,
      counts: {
        ...batch.counts,
        rowsAccepted: imported,
      },
    });

    return { imported, motorIds };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка импорта";
    await updateImportBatchAdmin(params.batchId, {
      status: "failed",
      error: message,
    });
    throw error;
  }
}

export async function rollbackImportBatchMotors(params: {
  companyId: string;
  uid: string;
  batchId: string;
}): Promise<{ deleted: number }> {
  const batch = await getImportBatchAdmin(params.companyId, params.batchId);
  if (!batch?.appliedMotorIds?.length) {
    throw new Error("There is nothing to roll back");
  }

  const db = getAdminFirestore();
  let deleted = 0;
  for (const motorId of batch.appliedMotorIds) {
    await db.collection("users").doc(params.uid).collection("motors").doc(motorId).set(
      {
        deletedAt: FieldValue.serverTimestamp(),
        status: "deleted",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    deleted += 1;
  }

  await updateImportBatchAdmin(params.batchId, {
    status: "cancelled",
    appliedMotorIds: [],
    error: null,
  });

  return { deleted };
}
