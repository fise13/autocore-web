import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const CODE_PATTERN = /^\d{6}$/;

export class VerificationCodeError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "VerificationCodeError";
    this.status = status;
  }
}

function codePepper(): string {
  return (
    process.env.EMAIL_VERIFICATION_CODE_SECRET?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    "autocore-email-verification"
  );
}

export function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function normalizeVerificationCodeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isValidVerificationCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

function hashVerificationCode(uid: string, code: string): string {
  return createHash("sha256").update(`${codePepper()}:${uid}:${code}`).digest("hex");
}

function hashesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function storeVerificationCode(uid: string, code: string): Promise<void> {
  const db = getAdminFirestore();
  const expiresAt = Timestamp.fromMillis(Date.now() + CODE_TTL_MS);
  await db.collection("users").doc(uid).set(
    {
      emailVerificationCodeHash: hashVerificationCode(uid, code),
      emailVerificationCodeExpiresAt: expiresAt,
      emailVerificationCodeAttempts: 0,
    },
    { merge: true },
  );
}

type VerificationRecord = {
  hash: string;
  expiresAt: Date;
  attempts: number;
};

async function readVerificationRecord(uid: string): Promise<VerificationRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();
  if (!data?.emailVerificationCodeHash || !data.emailVerificationCodeExpiresAt) {
    return null;
  }

  const rawExpires = data.emailVerificationCodeExpiresAt;
  const expiresAt =
    rawExpires instanceof Timestamp ? rawExpires.toDate() : rawExpires instanceof Date ? rawExpires : null;
  if (!expiresAt) return null;

  return {
    hash: String(data.emailVerificationCodeHash),
    expiresAt,
    attempts: Number(data.emailVerificationCodeAttempts ?? 0),
  };
}

async function clearVerificationCode(uid: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection("users").doc(uid).set(
    {
      emailVerificationCodeHash: FieldValue.delete(),
      emailVerificationCodeExpiresAt: FieldValue.delete(),
      emailVerificationCodeAttempts: FieldValue.delete(),
    },
    { merge: true },
  );
}

async function incrementVerificationAttempts(uid: string): Promise<number> {
  const db = getAdminFirestore();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const nextAttempts = Number(snap.data()?.emailVerificationCodeAttempts ?? 0) + 1;
  await ref.set({ emailVerificationCodeAttempts: nextAttempts }, { merge: true });
  return nextAttempts;
}

export async function verifyEmailVerificationCode(uid: string, rawCode: string): Promise<void> {
  const code = normalizeVerificationCodeInput(rawCode);
  if (!isValidVerificationCodeFormat(code)) {
    throw new VerificationCodeError("Введите 6-значный код из письма", 400);
  }

  const record = await readVerificationRecord(uid);
  if (!record) {
    throw new VerificationCodeError("Код устарел. Запросите новый.", 400);
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await clearVerificationCode(uid);
    throw new VerificationCodeError("Код истёк. Запросите новый.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await clearVerificationCode(uid);
    throw new VerificationCodeError("Слишком много попыток. Запросите новый код.", 429);
  }

  const actualHash = hashVerificationCode(uid, code);
  if (!hashesMatch(record.hash, actualHash)) {
    const attempts = await incrementVerificationAttempts(uid);
    if (attempts >= MAX_ATTEMPTS) {
      await clearVerificationCode(uid);
      throw new VerificationCodeError("Слишком много попыток. Запросите новый код.", 429);
    }
    throw new VerificationCodeError("Неверный код. Проверьте письмо и попробуйте снова.", 400);
  }

  await getAdminAuth().updateUser(uid, { emailVerified: true });
  await clearVerificationCode(uid);
}

export const VERIFICATION_CODE_TTL_MINUTES = CODE_TTL_MS / 60_000;
