import {
  collection,
  collectionGroup,
  doc,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { dateMs, toDateFromFirestore } from '@/lib/firestore-timestamp';
import { listenQuery } from '@/lib/firestore/trusted-snapshot';
import { getFirebaseDb } from '@/services/firebase';
import { MOTOR_STATUSES, type MotorEntity, type MotorFilters } from '@/types/motor';

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
  const status = MOTOR_STATUSES.includes(rawStatus as (typeof MOTOR_STATUSES)[number])
    ? (rawStatus as MotorEntity['status'])
    : soldDate
      ? 'sold'
      : 'available';

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
    photoUrls: Array.isArray(data.photoUrls)
      ? data.photoUrls.map((url) => String(url).trim()).filter(Boolean)
      : undefined,
    status,
    intakeJobId: typeof data.intakeJobId === 'string' ? data.intakeJobId : null,
    intakeStatus: typeof data.intakeStatus === 'string' ? data.intakeStatus : null,
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
    const existingUpdated = dateMs(existing.updatedAt, dateMs(existing.createdAt));
    const nextUpdated = dateMs(motor.updatedAt, dateMs(motor.createdAt));
    if (nextUpdated >= existingUpdated) byIdentity.set(key, motor);
  }

  return Array.from(byIdentity.values()).sort((left, right) => {
    const leftTime = dateMs(left.updatedAt, dateMs(left.createdAt));
    const rightTime = dateMs(right.updatedAt, dateMs(right.createdAt));
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
    mapped = mapped.filter(
      (item) => !item.soldDate && (!item.status || item.status === 'available'),
    );
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
      if (motor.status && motor.status !== 'available') {
        throw new Error('Engine intake must be verified before this motor can be sold');
      }
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
          brandName: (motor.brandName ?? '').trim() || 'Not specified',
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
      /**
       * Available-stock listeners must NOT open users/{uid}/motors.
       * That path is an unbounded sold archive and can freeze the JS thread for
       * seconds on snapshot delivery; company collectionGroup already has live stock.
       */
      const skipUserArchive =
        filters.availability === 'available' && !filters.soldOnly && Boolean(companyId);
      const sourceReady = { group: false, user: skipUserArchive };

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

      const groupQuery = query(
        collectionGroup(db, 'motors'),
        where('companyId', '==', companyId),
        limit(500),
      );
      const unsubGroup = listenQuery(
        groupQuery,
        (snapshot) => {
          ingest('group', snapshot.docs);
          sourceReady.group = true;
          emit();
        },
        (error) => {
          sourceReady.group = true;
          emit();
          onError?.(error);
        },
      );

      if (skipUserArchive) {
        return () => {
          unsubGroup();
        };
      }

      const userQuery = query(collection(db, 'users', filters.uid, 'motors'), limit(500));
      const unsubUser = listenQuery(
        userQuery,
        (snapshot) => {
          ingest('user', snapshot.docs);
          sourceReady.user = true;
          emit();
        },
        (error) => {
          sourceReady.user = true;
          emit();
          onError?.(error);
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
