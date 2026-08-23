import "server-only";

import { randomInt } from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

const CODE_TTL_MS = 5 * 60 * 1000;

type DesktopAuthCodeRecord = {
  uid: string;
  companyId: string;
  idToken: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

function codesCollection() {
  return getAdminFirestore().collection("desktop_auth_codes");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function createDesktopAuthCode(params: {
  uid: string;
  companyId: string;
  idToken: string;
}): Promise<string> {
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + CODE_TTL_MS);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCode();
    const ref = codesCollection().doc(code);
    const existing = await ref.get();
    if (existing.exists) continue;

    const record: DesktopAuthCodeRecord = {
      uid: params.uid,
      companyId: normalizeCompanyId(params.companyId),
      idToken: params.idToken,
      createdAt: Timestamp.fromMillis(now),
      expiresAt,
    };
    await ref.set(record);
    return code;
  }

  throw new Error("Could not generate a connection code");
}

export async function exchangeDesktopAuthCode(code: string): Promise<{ idToken: string }> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("Invalid code format");
  }

  const ref = codesCollection().doc(normalized);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error("That code was not found, or has already been used");
  }

  const data = snapshot.data() as DesktopAuthCodeRecord;
  const expiresAt = data.expiresAt.toMillis();
  if (Date.now() > expiresAt) {
    await ref.delete().catch(() => undefined);
    throw new Error("That code has expired");
  }

  await ref.delete();
  return { idToken: data.idToken };
}
