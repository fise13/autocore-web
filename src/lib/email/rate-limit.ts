import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";

const COOLDOWN_MS = 60_000;

export class EmailRateLimitError extends Error {
  retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(`Подождите ${retryAfterSec} сек. перед повторной отправкой`);
    this.name = "EmailRateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function remainingCooldown(lastSentAt: Date | null, now = Date.now()): number {
  if (!lastSentAt) return 0;
  const elapsed = now - lastSentAt.getTime();
  return Math.max(0, COOLDOWN_MS - elapsed);
}

export async function assertVerificationEmailRateLimit(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const raw = snap.data()?.lastVerificationEmailAt;
  const lastSentAt =
    raw instanceof Timestamp ? raw.toDate() : raw instanceof Date ? raw : null;
  const remaining = remainingCooldown(lastSentAt);
  if (remaining > 0) {
    throw new EmailRateLimitError(Math.ceil(remaining / 1000));
  }
}

export async function markVerificationEmailSent(uid: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection("users").doc(uid).set(
    { lastVerificationEmailAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function assertPasswordResetRateLimit(email: string): Promise<void> {
  const db = getAdminFirestore();
  const key = email.trim().toLowerCase();
  const ref = db.collection("emailRateLimits").doc(`password-reset:${key}`);
  const snap = await ref.get();
  const raw = snap.data()?.sentAt;
  const lastSentAt =
    raw instanceof Timestamp ? raw.toDate() : raw instanceof Date ? raw : null;
  const remaining = remainingCooldown(lastSentAt);
  if (remaining > 0) {
    throw new EmailRateLimitError(Math.ceil(remaining / 1000));
  }
}

export async function markPasswordResetEmailSent(email: string): Promise<void> {
  const db = getAdminFirestore();
  const key = email.trim().toLowerCase();
  await db.collection("emailRateLimits").doc(`password-reset:${key}`).set(
    { sentAt: FieldValue.serverTimestamp(), kind: "password-reset" },
    { merge: true },
  );
}
