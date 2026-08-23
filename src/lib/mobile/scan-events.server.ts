import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

export type ScanEventSource = "camera" | "manual" | "photo" | "ocr";
export type ScanEventOutcome =
  | "auto_accept"
  | "user_picked_candidate"
  | "user_rejected"
  | "created_mapping"
  | "unknown";

export type ScanEventInput = {
  companyId: string;
  userId: string;
  rawPayload: string;
  normalizedPayload: string;
  matchType: string | null;
  itemId: string | null;
  confidence: number;
  source: ScanEventSource;
  outcome: ScanEventOutcome;
  aiReasoning?: string;
};

export async function recordScanEvent(input: ScanEventInput): Promise<string> {
  const db = getAdminFirestore();
  const ref = await db.collection("scanEvents").add({
    companyId: normalizeCompanyId(input.companyId),
    userId: input.userId,
    rawPayload: input.rawPayload,
    normalizedPayload: input.normalizedPayload,
    matchType: input.matchType,
    itemId: input.itemId,
    confidence: input.confidence,
    source: input.source,
    outcome: input.outcome,
    aiReasoning: input.aiReasoning ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function createBarcodeMappingAdmin(input: {
  companyId: string;
  barcode: string;
  itemId: string;
  userId: string;
}): Promise<string> {
  const db = getAdminFirestore();
  const companyId = normalizeCompanyId(input.companyId);
  const barcode = input.barcode.trim().toUpperCase().replace(/\s+/g, "");
  if (!barcode) throw new Error("Provide a barcode");

  const existing = await db
    .collection("barcodeMappings")
    .where("companyId", "==", companyId)
    .where("barcode", "==", barcode)
    .limit(1)
    .get();

  const payload = {
    companyId,
    barcode,
    itemId: input.itemId,
    isPrimary: false,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUserId: input.userId,
  };

  if (!existing.empty) {
    const docId = existing.docs[0]!.id;
    await db.collection("barcodeMappings").doc(docId).set(payload, { merge: true });
    return docId;
  }

  const created = await db.collection("barcodeMappings").add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    createdByUserId: input.userId,
  });
  return created.id;
}
