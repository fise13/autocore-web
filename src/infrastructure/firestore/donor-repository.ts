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
} from "firebase/firestore";

import { CreateDonorInput, DonorStatus, DonorVehicle } from "@/domain/donor";
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
      const ref = input.id ? donorRef(input.companyId, input.id) : doc(donorsRef(input.companyId));
      const payload: Record<string, unknown> = {
        companyId: normalizeCompanyId(input.companyId),
        vin: (input.vin ?? "").trim().toUpperCase(),
        make: input.make.trim(),
        model: input.model.trim(),
        year: input.year ?? null,
        body: input.body?.trim() || null,
        purchasePrice: input.purchasePrice ?? 0,
        currency: input.currency ?? "KZT",
        source: input.source?.trim() || null,
        status: input.status ?? "intake",
        yardLocation: input.yardLocation?.trim() || null,
        photoUrls: input.photoUrls ?? [],
        notes: input.notes?.trim() || null,
        purchasedAt: input.purchasedAt ?? serverTimestamp(),
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      const snap = await getDoc(ref);
      return mapDonor(snap.id, snap.data() as Record<string, unknown>);
    },

    async update(companyId: string, donorId: string, patch: Partial<CreateDonorInput>) {
      await updateDoc(donorRef(companyId, donorId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },
  };
}
