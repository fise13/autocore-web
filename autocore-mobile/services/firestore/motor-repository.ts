import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { MotorEntity, MotorFilters } from '@/types/motor';

function readNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function readLocalId(docId: string, data: Record<string, unknown>): number {
  const fromField = readNumber(data.localId);
  if (fromField !== 0) return fromField;
  const parsed = Number(docId);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapMotor(docId: string, data: Record<string, unknown>): MotorEntity | null {
  const localId = readLocalId(docId, data);
  const serialCode = String(data.serialCode ?? '').trim();
  const soldDate = toDateFromFirestore(data.soldDate) ?? toDateFromFirestore(data.sold_date);
  const rawStatus = typeof data.status === 'string' ? data.status : '';
  const status = rawStatus || (soldDate ? 'sold' : 'available');

  if (!serialCode && !localId) return null;

  return {
    id: String(localId || docId),
    companyId: String(data.companyId ?? ''),
    localId: localId || undefined,
    engineId: readNumber(data.engineId) || undefined,
    serialCode,
    configuration: String(data.configuration ?? ''),
    notes: String(data.notes ?? ''),
    quantity: Number(data.quantity ?? 1),
    transmission: String(data.transmission ?? ''),
    arrivalDate: toDateFromFirestore(data.arrivalDate) ?? null,
    soldDate,
    deletedAt: toDateFromFirestore(data.deletedAt) ?? undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? undefined,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
    brandName: typeof data.brandName === 'string' ? data.brandName : '',
    engineCode: typeof data.engineCode === 'string' ? data.engineCode : '',
    warehouseLocation:
      typeof data.warehouseLocation === 'string' ? data.warehouseLocation : undefined,
    primaryLocationId:
      typeof data.primaryLocationId === 'string' ? data.primaryLocationId : undefined,
    primaryLocationCode:
      typeof data.primaryLocationCode === 'string' ? data.primaryLocationCode : undefined,
    status: status as MotorEntity['status'],
    reservedForWorkOrderId:
      typeof data.reservedForWorkOrderId === 'string' ? data.reservedForWorkOrderId : null,
    installedOnVehicleId:
      typeof data.installedOnVehicleId === 'string' ? data.installedOnVehicleId : null,
  };
}

function dedupeMotors(motors: MotorEntity[]): MotorEntity[] {
  const byIdentity = new Map<string, MotorEntity>();

  for (const motor of motors) {
    const key =
      motor.localId != null && motor.localId !== 0 ? `local:${motor.localId}` : `id:${motor.id}`;
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, motor);
      continue;
    }
    const existingUpdated = existing.updatedAt?.getTime() ?? existing.createdAt?.getTime() ?? 0;
    const nextUpdated = motor.updatedAt?.getTime() ?? motor.createdAt?.getTime() ?? 0;
    if (nextUpdated >= existingUpdated) byIdentity.set(key, motor);
  }

  return Array.from(byIdentity.values()).sort((left, right) => {
    const leftTime = left.updatedAt?.getTime() ?? left.createdAt?.getTime() ?? 0;
    const rightTime = right.updatedAt?.getTime() ?? right.createdAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}

function applyMotorFilters(motors: MotorEntity[], filters: MotorFilters): MotorEntity[] {
  let mapped = motors;

  if (!filters.includeDeleted) {
    mapped = mapped.filter((item) => !item.deletedAt);
  }
  if (filters.soldOnly) {
    mapped = mapped.filter((item) => Boolean(item.soldDate));
  } else if (filters.availability === 'available') {
    mapped = mapped.filter((item) => !item.soldDate);
  } else if (filters.availability === 'sold') {
    mapped = mapped.filter((item) => Boolean(item.soldDate));
  }
  if (filters.brandName?.trim()) {
    const brand = filters.brandName.toLowerCase().trim();
    mapped = mapped.filter((item) => item.brandName?.toLowerCase() === brand);
  }
  if (filters.engineCode?.trim()) {
    const code = filters.engineCode.toLowerCase().trim();
    mapped = mapped.filter((item) => item.engineCode?.toLowerCase() === code);
  }
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase().trim();
    mapped = mapped.filter(
      (item) =>
        item.serialCode.toLowerCase().includes(q) ||
        item.configuration.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q) ||
        item.engineCode?.toLowerCase().includes(q) ||
        item.brandName?.toLowerCase().includes(q),
    );
  }

  return mapped;
}

function motorDocRef(uid: string, motorId: string) {
  return doc(getFirebaseDb(), 'users', uid, 'motors', motorId);
}

export function createMotorRepository() {
  const db = getFirebaseDb();

  return {
    /**
     * Marks a motor as sold under the current user path (web-parity).
     * Uses merge so company-scoped motors from collectionGroup still resolve.
     */
    async sell(uid: string, motor: MotorEntity, soldDate: Date = new Date()): Promise<string> {
      const motorId = String(motor.localId ?? motor.id);
      const localId = motor.localId ?? Number(motorId);
      const companyId = normalizeCompanyId(motor.companyId);

      await setDoc(
        motorDocRef(uid, motorId),
        {
          companyId,
          localId: Number.isFinite(localId) ? localId : null,
          engineId: motor.engineId ?? null,
          serialCode: motor.serialCode.trim(),
          configuration: motor.configuration ?? '',
          notes: motor.notes ?? '',
          quantity: motor.quantity ?? 1,
          transmission: motor.transmission ?? '',
          arrivalDate: motor.arrivalDate ?? soldDate,
          soldDate,
          brandName: (motor.brandName ?? '').trim() || 'Не указан',
          engineCode: (motor.engineCode ?? '').trim() || '—',
          status: 'sold',
          reservedForWorkOrderId: motor.reservedForWorkOrderId ?? null,
          installedOnVehicleId: motor.installedOnVehicleId ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return motorId;
    },

    subscribe(
      filters: MotorFilters,
      onData: (motors: MotorEntity[]) => void,
      onError?: (error: Error) => void,
    ) {
      const companyId = normalizeCompanyId(filters.companyId);
      const merged = new Map<string, MotorEntity>();
      const sourceReady = { group: false, user: false };

      const emit = () => {
        if (!sourceReady.group || !sourceReady.user) return;
        const scoped = Array.from(merged.values()).filter(
          (motor) => !motor.companyId || motor.companyId === companyId,
        );
        onData(applyMotorFilters(dedupeMotors(scoped), filters));
      };

      const ingest = (prefix: string, docs: { id: string; data: () => Record<string, unknown> }[]) => {
        for (const key of [...merged.keys()]) {
          if (key.startsWith(`${prefix}:`)) merged.delete(key);
        }
        for (const item of docs) {
          const motor = mapMotor(item.id, item.data());
          if (!motor) continue;
          merged.set(`${prefix}:${motor.localId ?? item.id}`, motor);
        }
      };

      const groupQuery = query(collectionGroup(db, 'motors'), where('companyId', '==', companyId));
      const unsubGroup = onSnapshot(
        groupQuery,
        (snapshot) => {
          ingest('group', snapshot.docs);
          sourceReady.group = true;
          emit();
        },
        (error) => {
          sourceReady.group = true;
          emit();
          notifyFirestoreSnapshotError(error, onError);
        },
      );

      const unsubUser = onSnapshot(
        collection(db, 'users', filters.uid, 'motors'),
        (snapshot) => {
          ingest('user', snapshot.docs);
          sourceReady.user = true;
          emit();
        },
        (error) => {
          sourceReady.user = true;
          emit();
          notifyFirestoreSnapshotError(error, onError);
        },
      );

      return () => {
        unsubGroup();
        unsubUser();
      };
    },
  };
}

export const motorRepository = createMotorRepository();
