import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { parseServiceAccount } from "@/infrastructure/firebase/resolve-service-account";

let adminApp: App | null = null;

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
