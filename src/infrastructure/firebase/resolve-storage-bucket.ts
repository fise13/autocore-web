import "server-only";

import type { Bucket } from "@google-cloud/storage";

import { getAdminApp, getAdminStorage } from "@/infrastructure/firebase/admin";
import { isStorageBucketMissingError } from "@/lib/company/upload-company-logo-utils";

export { isStorageBucketMissingError };

let resolvedBucketName: string | null = null;

export function resetResolvedStorageBucket(): void {
  resolvedBucketName = null;
}

function configuredBucketCandidates(): string[] {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim();

  const candidates = [
    process.env.FIREBASE_STORAGE_BUCKET?.trim(),
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    getAdminApp().options.storageBucket?.toString().trim(),
    projectId ? `${projectId}.firebasestorage.app` : undefined,
    projectId ? `${projectId}.appspot.com` : undefined,
  ].filter(Boolean) as string[];

  return [...new Set(candidates)];
}

export async function resolveAdminStorageBucket(): Promise<Bucket> {
  const storage = getAdminStorage();
  const candidates = resolvedBucketName ? [resolvedBucketName] : configuredBucketCandidates();

  for (const name of candidates) {
    const bucket = storage.bucket(name);
    try {
      const [exists] = await bucket.exists();
      if (exists) {
        resolvedBucketName = name;
        return bucket;
      }
    } catch (error) {
      if (!isStorageBucketMissingError(error)) throw error;
    }
  }

  throw new Error(
    `Firebase Storage bucket не найден. Включите Storage в Firebase Console или проверьте FIREBASE_STORAGE_BUCKET. Проверены: ${candidates.join(", ")}`,
  );
}
