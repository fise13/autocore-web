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
  where,
  writeBatch,
} from "firebase/firestore";

import { CreateDomainEventInput, DomainEvent } from "@/domain/domain-event";
import { createDomainEventSchema } from "@/domain/schemas";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "domainEvents";

function eventsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function eventRef(companyId: string, eventId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, eventId);
}

function stableEventId(input: CreateDomainEventInput) {
  return input.id ?? input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mapEvent(id: string, data: Record<string, unknown>): DomainEvent {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    type: data.type as DomainEvent["type"],
    aggregateType: "work_order",
    aggregateId: String(data.aggregateId ?? ""),
    payload:
      typeof data.payload === "object" && data.payload != null
        ? (data.payload as Record<string, unknown>)
        : {},
    idempotencyKey: String(data.idempotencyKey ?? id),
    status: (data.status as DomainEvent["status"]) ?? "pending",
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    processedAt: toDateFromFirestore(data.processedAt) ?? undefined,
    error: typeof data.error === "string" ? data.error : undefined,
  };
}

export type DomainEventRepository = ReturnType<typeof createDomainEventRepository>;

export function createDomainEventRepository() {
  const db = getFirestoreDb();

  function buildPayload(input: CreateDomainEventInput) {
    const validated = createDomainEventSchema.parse({
      ...input,
      companyId: normalizeCompanyId(input.companyId),
      status: input.status ?? "pending",
    });
    const payload: Record<string, unknown> = { ...validated };
    delete payload.id;
    return {
      ...payload,
      createdAt: serverTimestamp(),
    };
  }

  return {
    subscribeByAggregate(
      companyId: string,
      aggregateId: string,
      onData: (events: DomainEvent[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !aggregateId) {
        onData([]);
        return () => undefined;
      }

      const q = query(
        eventsRef(companyId),
        where("aggregateId", "==", aggregateId),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      return onSnapshot(
        q,
        (snapshot) => onData(snapshot.docs.map((item) => mapEvent(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async append(input: CreateDomainEventInput): Promise<string> {
      const id = stableEventId(input);
      const ref = eventRef(input.companyId, id);
      const existing = await getDoc(ref);
      if (existing.exists()) return id;
      await setDoc(ref, buildPayload(input));
      return id;
    },

    async appendMany(companyId: string, events: CreateDomainEventInput[]): Promise<string[]> {
      if (events.length === 0) return [];

      const pending: Array<{
        ref: ReturnType<typeof eventRef>;
        payload: Record<string, unknown>;
      }> = [];
      const ids: string[] = [];

      for (const item of events) {
        const next = { ...item, companyId: normalizeCompanyId(companyId) };
        const id = stableEventId(next);
        ids.push(id);
        const ref = eventRef(next.companyId, id);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
          pending.push({ ref, payload: buildPayload(next) });
        }
      }

      if (pending.length > 0) {
        const batch = writeBatch(db);
        for (const item of pending) {
          batch.set(item.ref, item.payload);
        }
        await batch.commit();
      }

      return ids;
    },

    collectionRef: eventsRef,
    docRef: eventRef,
    mapEvent,
  };
}
