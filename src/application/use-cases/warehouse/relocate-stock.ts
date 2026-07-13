import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createInventoryLocationBalanceRepository } from "@/infrastructure/firestore/inventory-location-balance-repository";
import { createInventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { createInventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { createWarehouseLocationRepository } from "@/infrastructure/firestore/warehouse-location-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { computeAvailable } from "@/lib/warehouse/movement-logic";
import { normalizeWarehouseLocation } from "@/lib/warehouse/warehouse-search";

/**
 * Seed UNLOCATED balance from warehouse stock when the item has no location
 * balances yet (legacy stock). Safe to call repeatedly.
 */
export async function ensureLocationBalancesSeeded(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  actorUserId?: string;
}): Promise<{ unlocatedId: string; seeded: boolean }> {
  const companyId = normalizeCompanyId(params.companyId);
  const locationRepo = createWarehouseLocationRepository();
  const balanceRepo = createInventoryLocationBalanceRepository();
  const stockRepo = createInventoryStockLevelRepository();

  const unlocated = await locationRepo.ensureUnlocated(companyId, params.warehouseId, params.actorUserId);
  const existing = await balanceRepo.listByItemWarehouse(companyId, params.itemId, params.warehouseId);
  if (existing.length > 0) {
    return { unlocatedId: unlocated.id, seeded: false };
  }

  const stock = await stockRepo.getByItemAndWarehouse(params.itemId, params.warehouseId);
  const onHand = stock?.onHand ?? 0;
  const reserved = stock?.reserved ?? 0;
  if (onHand <= 0 && reserved <= 0) {
    return { unlocatedId: unlocated.id, seeded: false };
  }

  const db = getFirestoreDb();
  await runTransaction(db, async (transaction) => {
    balanceRepo.applyInTransaction(transaction, {
      companyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      locationId: unlocated.id,
      onHand,
      reserved,
    });
  });

  return { unlocatedId: unlocated.id, seeded: true };
}

/**
 * Move qty between locations in the same warehouse. Warehouse totals unchanged.
 */
export async function relocateStockUseCase(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
  actorUserId: string;
  idempotencyKey?: string;
}): Promise<{ movementId: string }> {
  if (params.fromLocationId === params.toLocationId) {
    throw new Error("Места должны отличаться");
  }
  const qty = Math.abs(params.quantity);
  if (qty <= 0) throw new Error("Укажите количество");

  const companyId = normalizeCompanyId(params.companyId);
  const db = getFirestoreDb();
  const balanceRepo = createInventoryLocationBalanceRepository();
  const movementRepo = createInventoryMovementRepository();
  const itemRepo = createInventoryItemRepository();
  const locationRepo = createWarehouseLocationRepository();

  await ensureLocationBalancesSeeded({
    companyId,
    itemId: params.itemId,
    warehouseId: params.warehouseId,
    actorUserId: params.actorUserId,
  });

  const fromLoc = await locationRepo.getById(params.fromLocationId);
  const toLoc = await locationRepo.getById(params.toLocationId);
  if (!fromLoc || fromLoc.warehouseId !== params.warehouseId) {
    throw new Error("Исходное место не найдено");
  }
  if (!toLoc || toLoc.warehouseId !== params.warehouseId) {
    throw new Error("Целевое место не найдено");
  }

  const idempotencyKey =
    params.idempotencyKey ??
    `relocation:${params.itemId}:${params.fromLocationId}:${params.toLocationId}:${qty}:${Date.now()}`;

  const existing = await getDocs(
    query(
      collection(db, "inventoryMovements"),
      where("companyId", "==", companyId),
      where("idempotencyKey", "==", idempotencyKey),
    ),
  );
  if (!existing.empty) {
    return { movementId: existing.docs[0].id };
  }

  const item = await itemRepo.getById(params.itemId);
  if (!item) throw new Error("Позиция не найдена");

  const fromRef = balanceRepo.buildDocRef(params.itemId, params.fromLocationId);
  const toRef = balanceRepo.buildDocRef(params.itemId, params.toLocationId);
  const itemRef = doc(db, "inventoryItems", params.itemId);
  const movementRef = doc(collection(db, "inventoryMovements"));

  await runTransaction(db, async (transaction) => {
    const fromSnap = await transaction.get(fromRef);
    const toSnap = await transaction.get(toRef);

    const fromOnHand = Number(fromSnap.data()?.onHand ?? 0);
    const fromReserved = Number(fromSnap.data()?.reserved ?? 0);
    const toOnHand = Number(toSnap.data()?.onHand ?? 0);
    const toReserved = Number(toSnap.data()?.reserved ?? 0);

    if (computeAvailable(fromOnHand, fromReserved) < qty) {
      throw new Error("Недостаточно остатка на исходном месте");
    }

    const nextFromOnHand = fromOnHand - qty;
    const nextToOnHand = toOnHand + qty;

    balanceRepo.applyInTransaction(transaction, {
      companyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      locationId: params.fromLocationId,
      onHand: nextFromOnHand,
      reserved: fromReserved,
    });
    balanceRepo.applyInTransaction(transaction, {
      companyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      locationId: params.toLocationId,
      onHand: nextToOnHand,
      reserved: toReserved,
    });

    transaction.set(
      movementRef,
      movementRepo.buildMovementPayload({
        companyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        type: "relocation",
        quantity: qty,
        beforeOnHand: fromOnHand,
        afterOnHand: nextFromOnHand,
        beforeReserved: fromReserved,
        afterReserved: fromReserved,
        fromLocationId: params.fromLocationId,
        toLocationId: params.toLocationId,
        referenceType: "manual",
        reason: params.reason ?? `Перемещение ${fromLoc.displayCode} → ${toLoc.displayCode}`,
        idempotencyKey,
        actorUserId: params.actorUserId,
      }),
    );

    transaction.update(itemRef, {
      primaryLocationId: params.toLocationId,
      primaryLocationCode: toLoc.displayCode,
      warehouseLocation: normalizeWarehouseLocation(toLoc.displayCode),
      updatedAt: serverTimestamp(),
      updatedByUserId: params.actorUserId,
    });
  });

  await createActivityLogRepository()
    .append(companyId, {
      actor: params.actorUserId,
      action: "inventory.relocation",
      target: `inventoryItem:${params.itemId}`,
      targetId: params.itemId,
      targetName: item.name,
      metadata: {
        fromLocationId: params.fromLocationId,
        toLocationId: params.toLocationId,
        quantity: qty,
      },
    })
    .catch(() => undefined);

  return { movementId: movementRef.id };
}

/**
 * When grid «Место» text changes: create/find custom leaf and set primary fields.
 * Moves available qty from UNLOCATED onto the leaf when balances exist/seed.
 */
export async function syncItemLocationAssignmentUseCase(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  locationText: string | undefined;
  previousText?: string;
  actorUserId: string;
}): Promise<void> {
  const next = normalizeWarehouseLocation(params.locationText);
  const prev = normalizeWarehouseLocation(params.previousText);
  if (next === prev) return;

  const companyId = normalizeCompanyId(params.companyId);
  const locationRepo = createWarehouseLocationRepository();
  const itemRepo = createInventoryItemRepository();
  const balanceRepo = createInventoryLocationBalanceRepository();

  const item = await itemRepo.getById(params.itemId);
  if (!item) return;

  if (!next) {
    await itemRepo.upsert(
      {
        companyId,
        sku: item.sku,
        name: item.name,
        type: item.type,
        barcodes: item.barcodes,
        brandName: item.brandName,
        supplierName: item.supplierName,
        warehouseLocation: undefined,
        primaryLocationCode: "",
        unit: item.unit,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        lowStockThreshold: item.lowStockThreshold,
        status: item.status,
        categoryPath: item.categoryPath,
        inventoryGroup: item.inventoryGroup,
        subcategoryId: item.subcategoryId,
        notes: item.notes,
        actorUserId: params.actorUserId,
      },
      params.itemId,
    );
    return;
  }

  const leaf = await locationRepo.ensureCustomLeaf(
    companyId,
    params.warehouseId,
    next,
    params.actorUserId,
  );

  await itemRepo.upsert(
    {
      companyId,
      sku: item.sku,
      name: item.name,
      type: item.type,
      barcodes: item.barcodes,
      brandName: item.brandName,
      supplierName: item.supplierName,
      warehouseLocation: next,
      primaryLocationId: leaf.id,
      primaryLocationCode: leaf.displayCode,
      unit: item.unit,
      purchasePrice: item.purchasePrice,
      sellPrice: item.sellPrice,
      lowStockThreshold: item.lowStockThreshold,
      status: item.status,
      categoryPath: item.categoryPath,
      inventoryGroup: item.inventoryGroup,
      subcategoryId: item.subcategoryId,
      notes: item.notes,
      actorUserId: params.actorUserId,
    },
    params.itemId,
  );

  const { unlocatedId } = await ensureLocationBalancesSeeded({
    companyId,
    itemId: params.itemId,
    warehouseId: params.warehouseId,
    actorUserId: params.actorUserId,
  });

  if (unlocatedId === leaf.id) return;

  const unlocatedBalance = await balanceRepo.getByItemAndLocation(params.itemId, unlocatedId);
  const available = unlocatedBalance?.available ?? 0;
  if (available > 0) {
    await relocateStockUseCase({
      companyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      fromLocationId: unlocatedId,
      toLocationId: leaf.id,
      quantity: available,
      reason: "Назначение места из таблицы склада",
      actorUserId: params.actorUserId,
      idempotencyKey: `assign:${params.itemId}:${leaf.id}:${available}`,
    });
  }
}
