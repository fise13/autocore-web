import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | null = null;

function readServiceAccountFromPath(filePath: string): Record<string, unknown> {
  const absolutePath = resolve(filePath);
  const raw = readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function parseInlineServiceAccount(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (trimmed.includes("...")) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON содержит placeholder (...). Укажите полный JSON сервисного аккаунта или FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json",
    );
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON: ${message}. Для локальной разработки удобнее FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json`,
    );
  }
}

function parseServiceAccount(): Record<string, unknown> {
  const pathFromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (pathFromEnv) {
    return readServiceAccountFromPath(pathFromEnv);
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error(
      "Firebase Admin не настроен. Задайте FIREBASE_SERVICE_ACCOUNT_PATH (локально) или FIREBASE_SERVICE_ACCOUNT_JSON (Vercel).",
    );
  }

  return parseInlineServiceAccount(raw);
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

  adminApp = initializeApp({
    credential: cert(parseServiceAccount() as Parameters<typeof cert>[0]),
    storageBucket,
  });
  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export function getStorageBucketName(): string {
  const bucket =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    getAdminApp().options.storageBucket;

  if (!bucket) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not configured");
  }
  return bucket;
}
