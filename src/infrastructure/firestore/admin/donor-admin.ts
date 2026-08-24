import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { CreateDonorInput } from "@/domain/donor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

export async function persistDonorAdmin(input: CreateDonorInput): Promise<string> {
  const companyId = normalizeCompanyId(input.companyId);
  const db = getAdminFirestore();
  const col = db.collection("companies").doc(companyId).collection("donors");
  const ref = input.id ? col.doc(input.id) : col.doc();
  await ref.set({
    companyId,
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
    purchasedAt: input.purchasedAt ?? FieldValue.serverTimestamp(),
    createdByUserId: input.createdByUserId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function findDonorIdByVinAdmin(companyId: string, vin: string): Promise<string | null> {
  const normalizedVin = vin.trim().toUpperCase();
  if (!normalizedVin) return null;
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("donors")
    .where("vin", "==", normalizedVin)
    .limit(1)
    .get();
  return snap.docs[0]?.id ?? null;
}
