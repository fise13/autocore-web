import {
  collection,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { createVehicleSchema } from '@/domain/schemas';
import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { listenQuery } from '@/lib/firestore/trusted-snapshot';
import { getFirebaseDb } from '@/services/firebase';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleEntity } from '@/types/vehicle';

const COLLECTION = 'vehicles';

function vehiclesRef(companyId: string) {
  return collection(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), COLLECTION);
}

function vehicleRef(companyId: string, vehicleId: string) {
  return doc(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), COLLECTION, vehicleId);
}

function mapVehicle(id: string, data: Record<string, unknown>): VehicleEntity {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    clientId: String(data.clientId ?? ''),
    make: String(data.make ?? ''),
    model: String(data.model ?? ''),
    year: data.year == null ? undefined : Number(data.year),
    vin: String(data.vin ?? ''),
    licensePlate: String(data.licensePlate ?? ''),
    currentMileage: Number(data.currentMileage ?? 0),
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === 'string' ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === 'string' ? data.updatedByUserId : undefined,
  };
}

export function createVehicleRepository() {
  return {
    subscribe(companyId: string, onData: (vehicles: VehicleEntity[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(vehiclesRef(companyId), orderBy('updatedAt', 'desc'), limit(300));
      return listenQuery(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapVehicle(item.id, item.data() as Record<string, unknown>))),
        onError,
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
        where('clientId', '==', clientId),
        orderBy('updatedAt', 'desc'),
        limit(50),
      );
      return listenQuery(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapVehicle(item.id, item.data() as Record<string, unknown>))),
        onError,
      );
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
  };
}

export const vehicleRepository = createVehicleRepository();
