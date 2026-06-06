import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleEntity,
  VehicleServiceHistoryEntry,
} from "@/domain/vehicle";
import { createVehicleSchema } from "@/domain/schemas";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "vehicles";

function vehiclesRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function vehicleRef(companyId: string, vehicleId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, vehicleId);
}

function serviceHistoryRef(companyId: string, vehicleId: string) {
  return collection(vehicleRef(companyId, vehicleId), "serviceHistory");
}

function mapVehicle(id: string, data: Record<string, unknown>): VehicleEntity {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    clientId: String(data.clientId ?? ""),
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    year: data.year == null ? undefined : Number(data.year),
    vin: String(data.vin ?? ""),
    licensePlate: String(data.licensePlate ?? ""),
    currentMileage: Number(data.currentMileage ?? 0),
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

function mapServiceHistoryEntry(
  id: string,
  data: Record<string, unknown>,
): VehicleServiceHistoryEntry {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    vehicleId: String(data.vehicleId ?? ""),
    workOrderId: String(data.workOrderId ?? ""),
    date: toDateFromFirestore(data.date) ?? new Date(),
    workTypes: Array.isArray(data.workTypes) ? data.workTypes.map(String) : [],
    motorId: typeof data.motorId === "string" ? data.motorId : undefined,
    mileage: Number(data.mileage ?? 0),
    documentIds: Array.isArray(data.documentIds) ? data.documentIds.map(String) : [],
  };
}

export type VehicleRepository = ReturnType<typeof createVehicleRepository>;

export function createVehicleRepository() {
  return {
    subscribe(
      companyId: string,
      onData: (vehicles: VehicleEntity[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(vehiclesRef(companyId), orderBy("updatedAt", "desc"), limit(300));
      return onSnapshot(
        q,
        (snapshot) => onData(snapshot.docs.map((item) => mapVehicle(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeByClient(
      companyId: string,
      clientId: string,
      onData: (vehicles: VehicleEntity[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !clientId) {
        onData([]);
        return () => undefined;
      }

      const q = query(
        vehiclesRef(companyId),
        where("clientId", "==", clientId),
        orderBy("updatedAt", "desc"),
        limit(100),
      );
      return onSnapshot(
        q,
        (snapshot) => onData(snapshot.docs.map((item) => mapVehicle(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, vehicleId: string): Promise<VehicleEntity | null> {
      const snapshot = await getDoc(vehicleRef(companyId, vehicleId));
      if (!snapshot.exists()) return null;
      return mapVehicle(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async create(input: CreateVehicleInput): Promise<VehicleEntity> {
      const validated = createVehicleSchema.parse({
        ...input,
        companyId: normalizeCompanyId(input.companyId),
      });
      const targetRef = validated.id
        ? vehicleRef(validated.companyId, validated.id)
        : doc(vehiclesRef(validated.companyId));
      const payload: Record<string, unknown> = { ...validated };
      delete payload.id;
      await setDoc(targetRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const snapshot = await getDoc(targetRef);
      return mapVehicle(snapshot.id, snapshot.data() as Record<string, unknown>);
    },

    async update(companyId: string, vehicleId: string, input: UpdateVehicleInput) {
      await updateDoc(vehicleRef(companyId, vehicleId), {
        ...input,
        updatedAt: serverTimestamp(),
      });
    },

    subscribeServiceHistory(
      companyId: string,
      vehicleId: string,
      onData: (history: VehicleServiceHistoryEntry[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !vehicleId) {
        onData([]);
        return () => undefined;
      }

      const q = query(serviceHistoryRef(companyId, vehicleId), orderBy("date", "desc"), limit(100));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapServiceHistoryEntry(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    collectionRef: vehiclesRef,
    docRef: vehicleRef,
    mapVehicle,
  };
}
