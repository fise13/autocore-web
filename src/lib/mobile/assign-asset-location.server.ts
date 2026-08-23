import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
  unlocatedLocationDocId,
} from "@/domain/warehouse-location";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { fetchMotorDocumentById } from "@/lib/desktop/fetch-motor.server";
import { normalizeWarehouseLocation } from "@/lib/warehouse/warehouse-search";

export type MobileAssignAssetLocationInput = {
  companyId: string;
  entityType: "motor" | "specific";
  entityId: string;
  toLocationId?: string;
  toLocationCode?: string;
  warehouseId?: string;
  actorUserId: string;
};

export type MobileAssignAssetLocationResult = {
  entityType: "motor" | "specific";
  entityId: string;
  warehouseId: string;
  toLocationId: string;
  toLocationCode: string;
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

async function resolveTargetLocation(params: {
  companyId: string;
  warehouseId: string;
  toLocationId?: string;
  toLocationCode?: string;
  actorUserId: string;
}) {
  if (params.toLocationId?.trim()) {
    const db = getAdminFirestore();
    const snap = await db.collection("warehouseLocations").doc(params.toLocationId.trim()).get();
    if (!snap.exists) throw new Error("Destination location not found");
    const data = snap.data() as Record<string, unknown>;
    if (String(data.warehouseId ?? "") !== params.warehouseId) {
      throw new Error("That location belongs to a different warehouse");
    }
    return {
      id: snap.id,
      displayCode: String(data.displayCode ?? data.code ?? ""),
    };
  }
  if (params.toLocationCode?.trim()) {
    return ensureCustomLeafAdmin(
      params.companyId,
      params.warehouseId,
      params.toLocationCode,
      params.actorUserId,
    );
  }
  throw new Error("Provide a destination location");
}

export async function assignMobileAssetLocation(
  input: MobileAssignAssetLocationInput,
): Promise<MobileAssignAssetLocationResult> {
  const companyId = normalizeCompanyId(input.companyId);
  const db = getAdminFirestore();
  const warehouseId =
    input.warehouseId?.trim() || (await resolveDefaultWarehouseId(companyId));
  if (!warehouseId) throw new Error("Warehouse not found");

  await ensureUnlocatedAdmin(companyId, warehouseId, input.actorUserId);
  const target = await resolveTargetLocation({
    companyId,
    warehouseId,
    toLocationId: input.toLocationId,
    toLocationCode: input.toLocationCode,
    actorUserId: input.actorUserId,
  });

  if (input.entityType === "motor") {
    const found = await fetchMotorDocumentById(companyId, input.entityId.trim());
    if (!found) throw new Error("Engine not found");

    const groupSnap = await db.collectionGroup("motors").where("companyId", "==", companyId).get();
    const matched = groupSnap.docs.find((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      return (
        doc.id === found.motor.id ||
        doc.id === input.entityId.trim() ||
        String(raw.localId ?? "") === String(found.motor.localId ?? "") ||
        String(raw.localId ?? "") === input.entityId.trim()
      );
    });
    if (!matched) throw new Error("Engine not found");

    await matched.ref.set(
      {
        warehouseLocation: target.displayCode,
        primaryLocationId: target.id,
        primaryLocationCode: target.displayCode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    const recordRef = db.collection("specificRecords").doc(input.entityId.trim());
    const recordSnap = await recordRef.get();
    if (!recordSnap.exists) throw new Error("Record not found");
    const data = recordSnap.data() as Record<string, unknown>;
    if (normalizeCompanyId(String(data.companyId ?? "")) !== companyId) {
      throw new Error("Record not found");
    }
    const recordData =
      data.data && typeof data.data === "object" && !Array.isArray(data.data)
        ? { ...(data.data as Record<string, string>) }
        : {};
    recordData.warehouseLocation = target.displayCode;

    await recordRef.set(
      {
        data: recordData,
        warehouseLocation: target.displayCode,
        primaryLocationId: target.id,
        primaryLocationCode: target.displayCode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    warehouseId,
    toLocationId: target.id,
    toLocationCode: target.displayCode,
    primaryLocationCode: target.displayCode,
  };
}
