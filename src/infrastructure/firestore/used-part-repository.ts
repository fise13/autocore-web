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

import { CreateUsedPartInput, UsedPart, UsedPartStatus } from "@/domain/used-part";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "usedParts";

function partsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function partRef(companyId: string, partId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, partId);
}

function mapPart(id: string, data: Record<string, unknown>): UsedPart {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    donorId: String(data.donorId ?? ""),
    name: String(data.name ?? ""),
    oemNumber: typeof data.oemNumber === "string" ? data.oemNumber : undefined,
    conditionPercent: data.conditionPercent == null ? undefined : Number(data.conditionPercent),
    quality: typeof data.quality === "string" ? data.quality : undefined,
    sellPrice: Number(data.sellPrice ?? 0),
    currency: String(data.currency ?? "KZT"),
    locationCode: typeof data.locationCode === "string" ? data.locationCode : undefined,
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.map(String).filter(Boolean) : [],
    applicability: String(data.applicability ?? ""),
    status: (data.status as UsedPartStatus) ?? "available",
    listedOnAvito: data.listedOnAvito === true,
    listedOnDrom: data.listedOnDrom === true,
    soldAt: toDateFromFirestore(data.soldAt),
    soldAmount: data.soldAmount == null ? undefined : Number(data.soldAmount),
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
    createdByUserId: String(data.createdByUserId ?? ""),
  };
}

export type UsedPartRepository = ReturnType<typeof createUsedPartRepository>;

export function createUsedPartRepository() {
  return {
    subscribe(companyId: string, onData: (parts: UsedPart[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const q = query(partsRef(companyId), orderBy("updatedAt", "desc"), limit(500));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapPart(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeByDonor(
      companyId: string,
      donorId: string,
      onData: (parts: UsedPart[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !donorId) {
        onData([]);
        return () => undefined;
      }
      const q = query(
        partsRef(companyId),
        where("donorId", "==", donorId),
        orderBy("updatedAt", "desc"),
        limit(200),
      );
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapPart(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async getById(companyId: string, partId: string): Promise<UsedPart | null> {
      const snap = await getDoc(partRef(companyId, partId));
      if (!snap.exists()) return null;
      return mapPart(snap.id, snap.data() as Record<string, unknown>);
    },

    async create(input: CreateUsedPartInput): Promise<UsedPart> {
      const ref = input.id ? partRef(input.companyId, input.id) : doc(partsRef(input.companyId));
      await setDoc(ref, {
        companyId: normalizeCompanyId(input.companyId),
        donorId: input.donorId,
        name: input.name.trim(),
        oemNumber: input.oemNumber?.trim() || null,
        conditionPercent: input.conditionPercent ?? null,
        quality: input.quality?.trim() || null,
        sellPrice: input.sellPrice ?? 0,
        currency: input.currency ?? "KZT",
        locationCode: input.locationCode?.trim() || null,
        photoUrls: input.photoUrls ?? [],
        applicability: input.applicability?.trim() || "",
        status: input.status ?? "available",
        listedOnAvito: input.listedOnAvito === true,
        listedOnDrom: input.listedOnDrom === true,
        notes: input.notes?.trim() || null,
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const snap = await getDoc(ref);
      return mapPart(snap.id, snap.data() as Record<string, unknown>);
    },

    async update(companyId: string, partId: string, patch: Record<string, unknown>) {
      await updateDoc(partRef(companyId, partId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },
  };
}
