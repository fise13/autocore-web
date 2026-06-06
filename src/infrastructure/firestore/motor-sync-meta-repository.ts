import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import { MotorSyncMeta } from "@/domain/motor-sync";
import { normalizeCompanyId } from "@/lib/company-id";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

export async function readMotorSyncMeta(uid: string): Promise<MotorSyncMeta | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const raw = snap.data().motorSyncMeta as Record<string, unknown> | undefined;
  if (!raw) return null;
  return {
    lastPulledAt: toDate(raw.lastPulledAt),
    lastPushedAt: toDate(raw.lastPushedAt),
    companyId: String(raw.companyId ?? ""),
  };
}

export async function writeMotorSyncMeta(
  uid: string,
  patch: Partial<{ lastPulledAt: Date; lastPushedAt: Date; companyId: string }>,
) {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const existing = (userSnap.data().motorSyncMeta as Record<string, unknown> | undefined) ?? {};
  const payload: Record<string, unknown> = {
    ...existing,
    updatedAt: serverTimestamp(),
  };
  if (patch.lastPulledAt) payload.lastPulledAt = patch.lastPulledAt;
  if (patch.lastPushedAt) payload.lastPushedAt = patch.lastPushedAt;
  if (patch.companyId) payload.companyId = normalizeCompanyId(patch.companyId);

  await updateDoc(userRef, {
    motorSyncMeta: payload,
  });
}
