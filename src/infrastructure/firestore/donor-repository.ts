import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { CreateDonorInput, DonorStatus, DonorVehicle, UpdateDonorInput } from "@/domain/donor";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "donors";

function donorsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function donorRef(companyId: string, donorId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, donorId);
}

function mapDonor(id: string, data: Record<string, unknown>): DonorVehicle {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    vin: String(data.vin ?? ""),
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    year: data.year == null ? undefined : Number(data.year),
    body: typeof data.body === "string" ? data.body : undefined,
    purchasePrice: Number(data.purchasePrice ?? 0),
    currency: String(data.currency ?? "KZT"),
    source: typeof data.source === "string" ? data.source : undefined,
    status: (data.status as DonorStatus) ?? "intake",
    yardLocation: typeof data.yardLocation === "string" ? data.yardLocation : undefined,
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.map(String).filter(Boolean) : [],
    notes: typeof data.notes === "string" ? data.notes : undefined,
    purchasedAt: toDateFromFirestore(data.purchasedAt),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
    createdByUserId: String(data.createdByUserId ?? ""),
  };
}

/** Empty text is stored as null so the field reads as "not set", not as "". */
function optionalText(value: string | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Only the fields a donor edit may touch, normalized the same way `create`
 * normalizes them. Identity (`companyId`, `createdByUserId`, `id`) is dropped:
 * rewriting it would either break the ownership check in the security rules or
 * silently reassign the record. `undefined` keys are dropped too — Firestore
 * rejects them outright.
 */
function donorUpdatePayload(patch: UpdateDonorInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (patch.vin !== undefined) payload.vin = patch.vin.trim().toUpperCase();
  if (patch.make !== undefined) payload.make = patch.make.trim();
  if (patch.model !== undefined) payload.model = patch.model.trim();
  if (patch.year !== undefined) payload.year = patch.year ?? null;
  if (patch.body !== undefined) payload.body = optionalText(patch.body);
  if (patch.purchasePrice !== undefined) payload.purchasePrice = patch.purchasePrice ?? 0;
  if (patch.currency !== undefined) payload.currency = patch.currency ?? "KZT";
  if (patch.source !== undefined) payload.source = optionalText(patch.source);
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.yardLocation !== undefined) payload.yardLocation = optionalText(patch.yardLocation);
  if (patch.photoUrls !== undefined) payload.photoUrls = patch.photoUrls ?? [];
  if (patch.notes !== undefined) payload.notes = optionalText(patch.notes);
  if (patch.purchasedAt !== undefined) payload.purchasedAt = patch.purchasedAt ?? null;
  return payload;
}

export type DonorRepository = ReturnType<typeof createDonorRepository>;

export function createDonorRepository() {
  return {
    subscribe(companyId: string, onData: (donors: DonorVehicle[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const q = query(donorsRef(companyId), orderBy("updatedAt", "desc"), limit(300));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapDonor(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, donorId: string): Promise<DonorVehicle | null> {
      const snap = await getDoc(donorRef(companyId, donorId));
      if (!snap.exists()) return null;
      return mapDonor(snap.id, snap.data() as Record<string, unknown>);
    },

    async create(input: CreateDonorInput): Promise<DonorVehicle> {
      const make = input.make.trim();
      if (!make) throw new Error("Donor make is required");
      const ref = input.id ? donorRef(input.companyId, input.id) : doc(donorsRef(input.companyId));
      const payload: Record<string, unknown> = {
        companyId: normalizeCompanyId(input.companyId),
        vin: (input.vin ?? "").trim().toUpperCase(),
        make,
        model: input.model.trim(),
        year: input.year ?? null,
        body: optionalText(input.body),
        purchasePrice: input.purchasePrice ?? 0,
        currency: input.currency ?? "KZT",
        source: optionalText(input.source),
        status: input.status ?? "intake",
        yardLocation: optionalText(input.yardLocation),
        photoUrls: input.photoUrls ?? [],
        notes: optionalText(input.notes),
        purchasedAt: input.purchasedAt ?? serverTimestamp(),
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      const snap = await getDoc(ref);
      return mapDonor(snap.id, snap.data() as Record<string, unknown>);
    },

    async update(companyId: string, donorId: string, patch: UpdateDonorInput) {
      const payload = donorUpdatePayload(patch);
      if (Object.keys(payload).length === 0) return;
      if (payload.make !== undefined && !payload.make) throw new Error("Donor make is required");
      await updateDoc(donorRef(companyId, donorId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    },

    /**
     * Hard delete. Callers must check first that no used part or motor still
     * points at the donor — Firestore has no cascade, and an orphaned part
     * loses its fitment and its payback line for good.
     */
    async remove(companyId: string, donorId: string) {
      await deleteDoc(donorRef(companyId, donorId));
    },
  };
}
