import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import {
  buildLocationDisplayCode,
  CreateWarehouseLocationInput,
  normalizeLocationCode,
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
  unlocatedLocationDocId,
  UpdateWarehouseLocationInput,
  WarehouseLocation,
  WarehouseLocationType,
  WAREHOUSE_LOCATION_TYPES,
} from "@/domain/warehouse-location";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { buildLocationEntityLink } from "@/lib/warehouse/location-entity-link";

const COLLECTION = "warehouseLocations";

function isLocationType(value: unknown): value is WarehouseLocationType {
  return typeof value === "string" && (WAREHOUSE_LOCATION_TYPES as readonly string[]).includes(value);
}

function mapLocation(id: string, data: Record<string, unknown>): WarehouseLocation {
  const path = Array.isArray(data.path)
    ? data.path.map((part) => String(part)).filter(Boolean)
    : [];
  const code = normalizeLocationCode(String(data.code ?? ""));
  return {
    id,
    companyId: String(data.companyId ?? ""),
    warehouseId: String(data.warehouseId ?? ""),
    parentId: data.parentId == null || data.parentId === "" ? null : String(data.parentId),
    type: isLocationType(data.type) ? data.type : "custom",
    code,
    path,
    displayCode:
      typeof data.displayCode === "string" && data.displayCode.trim()
        ? data.displayCode.trim()
        : buildLocationDisplayCode(path.length ? path : [code]),
    label: typeof data.label === "string" ? data.label : undefined,
    barcode: typeof data.barcode === "string" ? data.barcode : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : undefined,
    isSystem: Boolean(data.isSystem),
    isActive: data.isActive !== false,
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

function omitUndefined(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

function sortLocations(items: WarehouseLocation[]): WarehouseLocation[] {
  return [...items].sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.displayCode.localeCompare(b.displayCode, "ru");
  });
}

export type WarehouseLocationRepository = ReturnType<typeof createWarehouseLocationRepository>;

export function createWarehouseLocationRepository() {
  const db = getFirestoreDb();
  const ref = collection(db, COLLECTION);

  return {
    subscribeByWarehouse(
      companyId: string,
      warehouseId: string,
      onData: (locations: WarehouseLocation[]) => void,
      onError?: (error: Error) => void,
    ): Unsubscribe {
      const q = query(
        ref,
        where("companyId", "==", normalizeCompanyId(companyId)),
        where("warehouseId", "==", warehouseId),
        where("isActive", "==", true),
      );
      return onSnapshot(
        q,
        (snapshot) => {
          onData(sortLocations(snapshot.docs.map((item) => mapLocation(item.id, item.data() as Record<string, unknown>))));
        },
        (error) => {
          notifyFirestoreSnapshotError(error);
          onError?.(error);
        },
      );
    },

    async listByWarehouse(companyId: string, warehouseId: string, options?: { includeInactive?: boolean }): Promise<WarehouseLocation[]> {
      const constraints = [
        where("companyId", "==", normalizeCompanyId(companyId)),
        where("warehouseId", "==", warehouseId),
      ];
      if (!options?.includeInactive) {
        constraints.push(where("isActive", "==", true));
      }
      const snapshot = await getDocs(query(ref, ...constraints, limit(2000)));
      return sortLocations(snapshot.docs.map((item) => mapLocation(item.id, item.data() as Record<string, unknown>)));
    },

    async getById(locationId: string): Promise<WarehouseLocation | null> {
      const snap = await getDoc(doc(db, COLLECTION, locationId));
      if (!snap.exists()) return null;
      return mapLocation(snap.id, snap.data() as Record<string, unknown>);
    },

    async findByDisplayCode(
      companyId: string,
      warehouseId: string,
      displayCode: string,
    ): Promise<WarehouseLocation | null> {
      const normalized = displayCode.trim();
      if (!normalized) return null;
      const snapshot = await getDocs(
        query(
          ref,
          where("companyId", "==", normalizeCompanyId(companyId)),
          where("warehouseId", "==", warehouseId),
          where("displayCode", "==", normalized),
          limit(1),
        ),
      );
      const first = snapshot.docs[0];
      return first ? mapLocation(first.id, first.data() as Record<string, unknown>) : null;
    },

    async ensureUnlocated(companyId: string, warehouseId: string, actorUserId?: string): Promise<WarehouseLocation> {
      const id = unlocatedLocationDocId(warehouseId);
      const existing = await this.getById(id);
      if (existing) return existing;

      const payload = omitUndefined({
        companyId: normalizeCompanyId(companyId),
        warehouseId,
        parentId: null,
        type: "custom" as const,
        code: UNLOCATED_LOCATION_CODE,
        path: [UNLOCATED_LOCATION_CODE],
        displayCode: UNLOCATED_LOCATION_LABEL,
        label: UNLOCATED_LOCATION_LABEL,
        barcode: buildLocationEntityLink(id),
        isSystem: true,
        isActive: true,
        sortOrder: -1,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, COLLECTION, id), payload, { merge: true });
      return (
        (await this.getById(id)) ?? {
          id,
          companyId: normalizeCompanyId(companyId),
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
        }
      );
    },

    async create(input: CreateWarehouseLocationInput): Promise<string> {
      const companyId = normalizeCompanyId(input.companyId);
      const code = normalizeLocationCode(input.code);
      if (!code) throw new Error("Provide a location code");

      let path = input.path;
      let displayCode = input.displayCode;
      if (!path || !displayCode) {
        if (input.parentId) {
          const parent = await this.getById(input.parentId);
          if (!parent || parent.warehouseId !== input.warehouseId) {
            throw new Error("Parent location not found");
          }
          path = [...parent.path, code];
        } else {
          path = [code];
        }
        displayCode = buildLocationDisplayCode(path);
      }

      const locationRef = doc(ref);
      const entityLink = buildLocationEntityLink(locationRef.id);
      await setDoc(
        locationRef,
        omitUndefined({
          companyId,
          warehouseId: input.warehouseId,
          parentId: input.parentId ?? null,
          type: input.type,
          code,
          path,
          displayCode,
          label: input.label?.trim() || undefined,
          barcode: input.barcode?.trim() || entityLink,
          tags: input.tags,
          isSystem: input.isSystem ?? false,
          isActive: true,
          sortOrder: input.sortOrder ?? 0,
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      return locationRef.id;
    },

    /** Ensure QR payload is persisted (idempotent backfill). */
    async ensureEntityLink(locationId: string, actorUserId?: string): Promise<string> {
      const existing = await this.getById(locationId);
      if (!existing) throw new Error("Location not found");
      const link = buildLocationEntityLink(locationId);
      if (existing.barcode === link) return link;
      await updateDoc(
        doc(db, COLLECTION, locationId),
        omitUndefined({
          barcode: link,
          updatedByUserId: actorUserId,
          updatedAt: serverTimestamp(),
        }),
      );
      return link;
    },

    /**
     * Create a custom leaf from a free-text label (Excel «Место», quick add).
     * Idempotent on displayCode within the warehouse.
     */
    async ensureCustomLeaf(
      companyId: string,
      warehouseId: string,
      rawCode: string,
      actorUserId?: string,
    ): Promise<WarehouseLocation> {
      const code = normalizeLocationCode(rawCode);
      if (!code) {
        return this.ensureUnlocated(companyId, warehouseId, actorUserId);
      }
      const displayCode = buildLocationDisplayCode([code]);
      const existing = await this.findByDisplayCode(companyId, warehouseId, displayCode);
      if (existing) return existing;

      const id = await this.create({
        companyId,
        warehouseId,
        type: "custom",
        code,
        path: [code],
        displayCode,
        actorUserId,
      });
      const created = await this.getById(id);
      if (!created) throw new Error("Could not create the location");
      return created;
    },

    async update(locationId: string, input: UpdateWarehouseLocationInput): Promise<void> {
      const existing = await this.getById(locationId);
      if (!existing) throw new Error("Location not found");
      if (existing.isSystem && input.code != null) {
        throw new Error("A system location cannot be renamed");
      }

      const nextCode = input.code != null ? normalizeLocationCode(input.code) : existing.code;
      if (!nextCode) throw new Error("Provide a location code");

      let path = existing.path;
      let displayCode = existing.displayCode;
      if (input.code != null && nextCode !== existing.code) {
        path = existing.path.length ? [...existing.path.slice(0, -1), nextCode] : [nextCode];
        displayCode = buildLocationDisplayCode(path);
      }

      await updateDoc(
        doc(db, COLLECTION, locationId),
        omitUndefined({
          code: nextCode,
          path,
          displayCode,
          label: input.label === null ? null : input.label?.trim() || undefined,
          barcode: input.barcode === null ? null : input.barcode?.trim() || undefined,
          tags: input.tags === null ? [] : input.tags,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          updatedByUserId: input.actorUserId,
          updatedAt: serverTimestamp(),
        }),
      );
    },

    async deactivate(locationId: string, actorUserId?: string): Promise<void> {
      const existing = await this.getById(locationId);
      if (!existing) return;
      if (existing.isSystem) throw new Error("A system location cannot be deleted");
      await this.update(locationId, { isActive: false, actorUserId });
    },
  };
}
