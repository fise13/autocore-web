import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
  unlocatedLocationDocId,
} from "@/domain/warehouse-location";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { computeAvailable } from "@/lib/warehouse/movement-logic";
import { normalizeWarehouseLocation } from "@/lib/warehouse/warehouse-search";
import {
  locationBalanceDocumentId,
  stockLevelDocumentId,
} from "@/lib/warehouse/warehouse-sync-ids";

export type MobileRelocateInput = {
  companyId: string;
  itemId: string;
  warehouseId?: string;
  /** Prefer explicit id; otherwise resolve/create from code. */
  toLocationId?: string;
  toLocationCode?: string;
  fromLocationId?: string;
  quantity?: number;
  actorUserId: string;
  idempotencyKey?: string;
  reason?: string;
};

export type MobileRelocateResult = {
  movementId: string;
  warehouseId: string;
  fromLocationId: string;
  toLocationId: string;
  toLocationCode: string;
  quantity: number;
  primaryLocationCode: string;
};

async function resolveDefaultWarehouseId(companyId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("warehouses")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .limit(5)
    .get();
  if (snap.empty) return null;
  const preferred = snap.docs.find((doc) => doc.data().isDefault === true);
  return (preferred ?? snap.docs[0]).id;
}

async function ensureUnlocatedAdmin(companyId: string, warehouseId: string, actorUserId: string) {
  const db = getAdminFirestore();
  const id = unlocatedLocationDocId(warehouseId);
  const ref = db.collection("warehouseLocations").doc(id);
  const snap = await ref.get();
  if (snap.exists) return { id, displayCode: UNLOCATED_LOCATION_LABEL };

  await ref.set(
    {
      companyId,
      warehouseId,
      parentId: null,
      type: "custom",
      code: UNLOCATED_LOCATION_CODE,
      path: [UNLOCATED_LOCATION_CODE],
      displayCode: UNLOCATED_LOCATION_LABEL,
      label: UNLOCATED_LOCATION_LABEL,
      isSystem: true,
      isActive: true,
      sortOrder: -1,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { id, displayCode: UNLOCATED_LOCATION_LABEL };
}

async function ensureCustomLeafAdmin(
  companyId: string,
  warehouseId: string,
  rawCode: string,
  actorUserId: string,
) {
  const code = normalizeWarehouseLocation(rawCode) || rawCode.trim();
  if (!code) throw new Error("Provide a location code");

  const db = getAdminFirestore();
  const existing = await db
    .collection("warehouseLocations")
    .where("companyId", "==", companyId)
    .where("warehouseId", "==", warehouseId)
    .where("displayCode", "==", code)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return { id: doc.id, displayCode: String(doc.data().displayCode ?? code) };
  }

  const ref = db.collection("warehouseLocations").doc();
  await ref.set({
    companyId,
    warehouseId,
    parentId: null,
    type: "custom",
    code,
    path: [code],
    displayCode: code,
    isSystem: false,
    isActive: true,
    sortOrder: 0,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, displayCode: code };
}

async function seedUnlocatedBalanceIfNeeded(params: {
  companyId: string;
  itemId: string;
  warehouseId: string;
  unlocatedId: string;
}) {
  const db = getAdminFirestore();
  const balances = await db
    .collection("inventoryLocationBalances")
    .where("companyId", "==", params.companyId)
    .where("itemId", "==", params.itemId)
    .where("warehouseId", "==", params.warehouseId)
    .limit(5)
    .get();
  if (!balances.empty) return;

  const stockSnap = await db
    .collection("inventoryStockLevels")
    .doc(stockLevelDocumentId(params.itemId, params.warehouseId))
    .get();
  const onHand = Number(stockSnap.data()?.onHand ?? 0);
  const reserved = Number(stockSnap.data()?.reserved ?? 0);
  if (onHand <= 0 && reserved <= 0) return;

  await db
    .collection("inventoryLocationBalances")
    .doc(locationBalanceDocumentId(params.itemId, params.unlocatedId))
    .set(
      {
        companyId: params.companyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        locationId: params.unlocatedId,
        onHand,
        reserved,
        available: computeAvailable(onHand, reserved),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function relocateMobileStock(
  input: MobileRelocateInput,
): Promise<MobileRelocateResult> {
  const companyId = normalizeCompanyId(input.companyId);
  const db = getAdminFirestore();

  const warehouseId =
    input.warehouseId?.trim() || (await resolveDefaultWarehouseId(companyId));
  if (!warehouseId) throw new Error("Warehouse not found");

  const itemRef = db.collection("inventoryItems").doc(input.itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) throw new Error("Item not found");
  const itemData = itemSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(itemData.companyId ?? "")) !== companyId) {
    throw new Error("Item not found");
  }

  const unlocated = await ensureUnlocatedAdmin(companyId, warehouseId, input.actorUserId);
  await seedUnlocatedBalanceIfNeeded({
    companyId,
    itemId: input.itemId,
    warehouseId,
    unlocatedId: unlocated.id,
  });

  let toLocationId = input.toLocationId?.trim() || "";
  let toLocationCode = "";
  if (toLocationId) {
    const toSnap = await db.collection("warehouseLocations").doc(toLocationId).get();
    if (!toSnap.exists) throw new Error("Destination location not found");
    const toData = toSnap.data() as Record<string, unknown>;
    if (String(toData.warehouseId ?? "") !== warehouseId) {
      throw new Error("That location belongs to a different warehouse");
    }
    toLocationCode = String(toData.displayCode ?? toData.code ?? "");
  } else if (input.toLocationCode?.trim()) {
    const leaf = await ensureCustomLeafAdmin(
      companyId,
      warehouseId,
      input.toLocationCode,
      input.actorUserId,
    );
    toLocationId = leaf.id;
    toLocationCode = leaf.displayCode;
  } else {
    throw new Error("Provide a destination location");
  }

  const fromLocationId = input.fromLocationId?.trim() || unlocated.id;
  if (fromLocationId === toLocationId) {
    throw new Error("The locations must be different");
  }

  const fromSnap = await db.collection("warehouseLocations").doc(fromLocationId).get();
  if (!fromSnap.exists) throw new Error("Source location not found");

  const fromBalanceRef = db
    .collection("inventoryLocationBalances")
    .doc(locationBalanceDocumentId(input.itemId, fromLocationId));
  const toBalanceRef = db
    .collection("inventoryLocationBalances")
    .doc(locationBalanceDocumentId(input.itemId, toLocationId));

  const fromBalanceSnap = await fromBalanceRef.get();
  const available = computeAvailable(
    Number(fromBalanceSnap.data()?.onHand ?? 0),
    Number(fromBalanceSnap.data()?.reserved ?? 0),
  );
  const qty =
    input.quantity != null && Number.isFinite(Number(input.quantity))
      ? Math.floor(Number(input.quantity))
      : available;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Not enough stock to move");
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    `mobile:relocate:${input.itemId}:${fromLocationId}:${toLocationId}:${qty}:${Date.now()}`;

  const existing = await db
    .collection("inventoryMovements")
    .where("companyId", "==", companyId)
    .where("idempotencyKey", "==", idempotencyKey)
    .limit(1)
    .get();
  if (!existing.empty) {
    return {
      movementId: existing.docs[0].id,
      warehouseId,
      fromLocationId,
      toLocationId,
      toLocationCode,
      quantity: qty,
      primaryLocationCode: toLocationCode,
    };
  }

  const movementRef = db.collection("inventoryMovements").doc();
  const fromDisplay = String(fromSnap.data()?.displayCode ?? fromSnap.data()?.code ?? "");

  await db.runTransaction(async (transaction) => {
    const fromBal = await transaction.get(fromBalanceRef);
    const toBal = await transaction.get(toBalanceRef);

    const fromOnHand = Number(fromBal.data()?.onHand ?? 0);
    const fromReserved = Number(fromBal.data()?.reserved ?? 0);
    const toOnHand = Number(toBal.data()?.onHand ?? 0);
    const toReserved = Number(toBal.data()?.reserved ?? 0);

    if (computeAvailable(fromOnHand, fromReserved) < qty) {
      throw new Error("Not enough stock at the source location");
    }

    const nextFrom = fromOnHand - qty;
    const nextTo = toOnHand + qty;

    transaction.set(
      fromBalanceRef,
      {
        companyId,
        itemId: input.itemId,
        warehouseId,
        locationId: fromLocationId,
        onHand: nextFrom,
        reserved: fromReserved,
        available: computeAvailable(nextFrom, fromReserved),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      toBalanceRef,
      {
        companyId,
        itemId: input.itemId,
        warehouseId,
        locationId: toLocationId,
        onHand: nextTo,
        reserved: toReserved,
        available: computeAvailable(nextTo, toReserved),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(movementRef, {
      companyId,
      itemId: input.itemId,
      warehouseId,
      type: "relocation",
      quantity: qty,
      beforeOnHand: fromOnHand,
      afterOnHand: nextFrom,
      beforeReserved: fromReserved,
      afterReserved: fromReserved,
      fromLocationId,
      toLocationId,
      referenceType: "manual",
      reason:
        input.reason?.trim() ||
        `Перемещение ${fromDisplay || "—"} → ${toLocationCode}`,
      idempotencyKey,
      actorUserId: input.actorUserId,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.update(itemRef, {
      primaryLocationId: toLocationId,
      primaryLocationCode: toLocationCode,
      warehouseLocation: toLocationCode,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUserId: input.actorUserId,
    });
  });

  return {
    movementId: movementRef.id,
    warehouseId,
    fromLocationId,
    toLocationId,
    toLocationCode,
    quantity: qty,
    primaryLocationCode: toLocationCode,
  };
}

export type MobileWarehouseLocationDto = {
  id: string;
  warehouseId: string;
  displayCode: string;
  code: string;
  isSystem?: boolean;
  type: string;
};

export async function listMobileWarehouseLocations(params: {
  companyId: string;
  warehouseId: string;
}): Promise<MobileWarehouseLocationDto[]> {
  const companyId = normalizeCompanyId(params.companyId);
  const db = getAdminFirestore();
  const snap = await db
    .collection("warehouseLocations")
    .where("companyId", "==", companyId)
    .where("warehouseId", "==", params.warehouseId)
    .where("isActive", "==", true)
    .limit(500)
    .get();

  return snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        warehouseId: String(data.warehouseId ?? ""),
        displayCode: String(data.displayCode ?? data.code ?? ""),
        code: String(data.code ?? ""),
        isSystem: Boolean(data.isSystem),
        type: String(data.type ?? "custom"),
      };
    })
    .sort((a, b) => {
      if (Boolean(a.isSystem) !== Boolean(b.isSystem)) return a.isSystem ? 1 : -1;
      return a.displayCode.localeCompare(b.displayCode, "ru");
    });
}
