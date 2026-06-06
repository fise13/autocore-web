import {
  FirestoreError,
  Timestamp,
  collection,
  collectionGroup,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { MotorEntity, UpsertMotorInput } from "@/domain/motor";
import { upsertMotorSchema } from "@/domain/schemas";
import { normalizeCompanyId } from "@/lib/company-id";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

async function appendActivitySafely(
  activity: ReturnType<typeof createActivityLogRepository>,
  companyId: string,
  payload: Parameters<ReturnType<typeof createActivityLogRepository>["append"]>[1],
) {
  try {
    await activity.append(companyId, payload);
  } catch {
    // Activity log must not block inventory sync.
  }
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    const nanoseconds = Number((value as { nanoseconds?: unknown }).nanoseconds ?? 0);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
    }
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function readNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
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
  const serialCode = String(data.serialCode ?? "").trim();
  const soldDate = toDate(data.soldDate) ?? toDate(data.sold_date);
  const rawStatus = typeof data.status === "string" ? data.status : "";
  const status = rawStatus || (soldDate ? "sold" : "available");

  if (!serialCode && !localId) return null;

  return {
    id: String(localId || docId),
    companyId: String(data.companyId ?? ""),
    localId: localId || undefined,
    engineId: readNumber(data.engineId) || undefined,
    serialCode,
    configuration: String(data.configuration ?? ""),
    notes: String(data.notes ?? ""),
    quantity: Number(data.quantity ?? 1),
    transmission: String(data.transmission ?? ""),
    arrivalDate: toDate(data.arrivalDate),
    soldDate,
    deletedAt: toDate(data.deletedAt),
    createdAt: toDate(data.createdAt) ?? undefined,
    updatedAt: toDate(data.updatedAt) ?? undefined,
    brandName: typeof data.brandName === "string" ? data.brandName : "",
    engineCode: typeof data.engineCode === "string" ? data.engineCode : "",
    status: status as MotorEntity["status"],
    reservedForWorkOrderId:
      typeof data.reservedForWorkOrderId === "string" ? data.reservedForWorkOrderId : null,
    installedOnVehicleId:
      typeof data.installedOnVehicleId === "string" ? data.installedOnVehicleId : null,
  };
}

function dedupeMotors(motors: MotorEntity[]): MotorEntity[] {
  const byIdentity = new Map<string, MotorEntity>();

  for (const motor of motors) {
    const key =
      motor.localId != null && motor.localId !== 0
        ? `local:${motor.localId}`
        : `id:${motor.id}`;
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, motor);
      continue;
    }

    const existingUpdated = existing.updatedAt?.getTime() ?? existing.createdAt?.getTime() ?? 0;
    const nextUpdated = motor.updatedAt?.getTime() ?? motor.createdAt?.getTime() ?? 0;
    if (nextUpdated >= existingUpdated) {
      byIdentity.set(key, motor);
    }
  }

  const byId = new Map<string, MotorEntity>();
  for (const motor of byIdentity.values()) {
    const existing = byId.get(motor.id);
    if (!existing) {
      byId.set(motor.id, motor);
      continue;
    }
    const existingUpdated = existing.updatedAt?.getTime() ?? existing.createdAt?.getTime() ?? 0;
    const nextUpdated = motor.updatedAt?.getTime() ?? motor.createdAt?.getTime() ?? 0;
    if (nextUpdated >= existingUpdated) {
      byId.set(motor.id, motor);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const bTime = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function applyMotorFilters(motors: MotorEntity[], filters: MotorFilters): MotorEntity[] {
  let mapped = motors;

  if (!filters.includeDeleted) {
    mapped = mapped.filter((item) => !item.deletedAt);
  }

  if (filters.soldOnly) {
    mapped = mapped.filter((item) => Boolean(item.soldDate));
  } else if (filters.availability === "available") {
    mapped = mapped.filter((item) => !item.soldDate);
  } else if (filters.availability === "sold") {
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

export type MotorAvailability = "all" | "available" | "sold";

export type MotorFilters = {
  uid: string;
  companyId: string;
  soldOnly?: boolean;
  availability?: MotorAvailability;
  includeDeleted?: boolean;
  search?: string;
  brandName?: string;
  engineCode?: string;
};

export type MotorRepository = ReturnType<typeof createMotorRepository>;

export function createMotorRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();

  function motorDocRef(uid: string, motorId: string) {
    return doc(db, "users", uid, "motors", motorId);
  }

  function buildFullDocument(input: UpsertMotorInput, localId: number) {
    const payload: Record<string, unknown> = {
      companyId: normalizeCompanyId(input.companyId),
      localId,
      engineId: input.engineId ?? null,
      serialCode: input.serialCode.trim(),
      configuration: input.configuration ?? "",
      notes: input.notes ?? "",
      quantity: input.quantity ?? 1,
      transmission: input.transmission ?? "",
      soldDate: input.soldDate ?? null,
      deletedAt: input.deletedAt ?? null,
      brandName: (input.brandName ?? "").trim() || "Не указан",
      engineCode: (input.engineCode ?? "").trim() || "—",
      status: input.status ?? (input.soldDate ? "sold" : "available"),
      reservedForWorkOrderId: input.reservedForWorkOrderId ?? null,
      installedOnVehicleId: input.installedOnVehicleId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.arrivalDate) {
      payload.arrivalDate = input.arrivalDate;
    }

    return payload;
  }

  return {
    subscribe(
      filters: MotorFilters,
      onData: (motors: MotorEntity[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const companyId = normalizeCompanyId(filters.companyId);
      const merged = new Map<string, MotorEntity>();
      const sourceReady = {
        group: false,
        user: false,
      };

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

      const groupQuery = query(collectionGroup(db, "motors"), where("companyId", "==", companyId));
      const unsubGroup = onSnapshot(
        groupQuery,
        (snapshot) => {
          ingest("group", snapshot.docs);
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
        collection(db, "users", filters.uid, "motors"),
        (snapshot) => {
          ingest("user", snapshot.docs);
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

    async create(uid: string, input: UpsertMotorInput, existingMotors: MotorEntity[] = []) {
      const validated = upsertMotorSchema.parse({
        ...input,
        companyId: normalizeCompanyId(input.companyId),
      });
      const localId = validated.localId ?? generateWebLocalId(existingMotors);
      const payload = buildFullDocument(validated, localId);
      await setDoc(motorDocRef(uid, String(localId)), payload, { merge: true });
      await appendActivitySafely(activity, validated.companyId, {
        actor: uid,
        action: "inventory.motor_created",
        target: `motor:${localId}`,
      });
      return String(localId);
    },

    async update(uid: string, motorId: string, input: Partial<UpsertMotorInput>) {
      const payload: Record<string, unknown> = {
        ...input,
        updatedAt: serverTimestamp(),
      };

      if (input.soldDate === null) payload.soldDate = null;
      if (input.deletedAt === null) payload.deletedAt = deleteField();
      if (input.arrivalDate === null) payload.arrivalDate = deleteField();
      if (input.reservedForWorkOrderId === null) payload.reservedForWorkOrderId = null;
      if (input.installedOnVehicleId === null) payload.installedOnVehicleId = null;

      await updateDoc(motorDocRef(uid, motorId), payload);
    },

    async upsert(uid: string, motorId: string, input: UpsertMotorInput) {
      const validated = upsertMotorSchema.parse({
        ...input,
        companyId: normalizeCompanyId(input.companyId),
      });
      const localId = validated.localId ?? Number(motorId);
      const payload = {
        ...buildFullDocument(validated, localId),
        updatedAt: serverTimestamp(),
      };
      await setDoc(motorDocRef(uid, String(localId)), payload, { merge: true });
      let action = "inventory.motor_updated";
      if (input.soldDate instanceof Date) {
        action = "inventory.motor_sold";
      } else if (input.soldDate === null) {
        action = "inventory.motor_unsold";
      }
      await appendActivitySafely(activity, validated.companyId, {
        actor: uid,
        action,
        target: `motor:${localId}`,
        targetId: String(localId),
        targetName: validated.serialCode || undefined,
      });
      return String(localId);
    },

    async sell(uid: string, motorId: string, soldDate: Date = new Date(), companyId?: string) {
      await updateDoc(motorDocRef(uid, motorId), {
        soldDate,
        status: "sold",
        updatedAt: serverTimestamp(),
      });
      if (companyId) {
        await appendActivitySafely(activity, normalizeCompanyId(companyId), {
          actor: uid,
          action: "inventory.motor_sold",
          target: `motor:${motorId}`,
          targetId: motorId,
        });
      }
    },

    async unsell(uid: string, motorId: string, companyId?: string) {
      await updateDoc(motorDocRef(uid, motorId), {
        soldDate: null,
        status: "available",
        updatedAt: serverTimestamp(),
      });
      if (companyId) {
        await appendActivitySafely(activity, normalizeCompanyId(companyId), {
          actor: uid,
          action: "inventory.motor_unsold",
          target: `motor:${motorId}`,
          targetId: motorId,
        });
      }
    },

    async softDelete(uid: string, motorId: string, payload?: UpsertMotorInput) {
      const base = payload
        ? {
            companyId: normalizeCompanyId(payload.companyId),
            localId: payload.localId ?? Number(motorId),
            serialCode: payload.serialCode,
            configuration: payload.configuration ?? "",
            notes: payload.notes ?? "",
            quantity: payload.quantity ?? 1,
            transmission: payload.transmission ?? "",
            brandName: payload.brandName ?? "",
            engineCode: payload.engineCode ?? "",
            ...(payload.arrivalDate ? { arrivalDate: payload.arrivalDate } : {}),
          }
        : {
            localId: Number(motorId),
          };

      await setDoc(
        motorDocRef(uid, motorId),
        {
          ...base,
          deletedAt: new Date(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      if (payload?.companyId) {
        await appendActivitySafely(activity, normalizeCompanyId(payload.companyId), {
          actor: uid,
          action: "inventory.motor_deleted",
          target: `motor:${motorId}`,
        });
      }
    },
  };
}

export function generateWebLocalId(existingMotors: MotorEntity[]): number {
  const used = new Set(
    existingMotors
      .map((motor) => motor.localId ?? Number(motor.id))
      .filter((value) => Number.isFinite(value)),
  );

  let candidate = -Math.floor(Date.now() % 2_000_000_000);
  while (used.has(candidate)) {
    candidate -= 1;
  }
  return candidate;
}

export function isMotorRowEmpty(
  motor: Pick<MotorEntity, "serialCode" | "configuration" | "notes" | "transmission">,
) {
  return (
    !motor.serialCode.trim() &&
    !motor.configuration.trim() &&
    !motor.notes.trim() &&
    !motor.transmission.trim()
  );
}
