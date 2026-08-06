import "server-only";

import { randomUUID } from "node:crypto";

import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { buildFirebaseStorageDownloadUrl } from "@/lib/company/upload-company-logo-utils";
import { normalizeCompanyId } from "@/lib/company-id";

const MAX_INTAKE_PHOTO_BYTES = 25 * 1024 * 1024;
const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function assertIntakePhotoUpload(input: {
  contentType: string;
  sizeBytes: number;
}): { contentType: string; extension: string } {
  const contentType = input.contentType.trim().toLowerCase();
  const extension = CONTENT_TYPE_EXTENSION[contentType];
  if (!extension) {
    throw new Error("Only JPEG, PNG, WebP, HEIC, and HEIF photos are supported");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Photo is empty");
  }
  if (input.sizeBytes > MAX_INTAKE_PHOTO_BYTES) {
    throw new Error("Photo exceeds the 25 MB limit");
  }
  return { contentType, extension };
}

export async function prepareIntakePhotoUpload(input: {
  companyId: string;
  jobId: string;
  photoId: string;
  contentType: string;
  extension: string;
  storagePath?: string;
  preserveExisting?: boolean;
}): Promise<{
  uploadUrl: string;
  storagePath: string;
  downloadToken: string;
  url: string;
}> {
  const companyId = normalizeCompanyId(input.companyId);
  const jobId = input.jobId.trim();
  const photoId = input.photoId.trim();
  if (!companyId || !jobId || !photoId) {
    throw new Error("Company, job, and photo IDs are required");
  }

  const canonicalStoragePath = `companies/${companyId}/engine-intake/${jobId}/${photoId}.${input.extension}`;
  const storagePath = input.storagePath?.trim() || canonicalStoragePath;
  if (storagePath !== canonicalStoragePath) {
    throw new Error("Intake photo storage path does not match its content type");
  }
  const downloadToken = randomUUID();
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!input.preserveExisting || !exists) {
    await file.save(Buffer.alloc(0), {
      contentType: input.contentType,
      metadata: {
        cacheControl: "private, max-age=86400",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
      resumable: false,
    });
  }

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1_000,
    contentType: input.contentType,
  });

  return {
    uploadUrl,
    storagePath,
    downloadToken,
    url: buildFirebaseStorageDownloadUrl(bucket.name, storagePath, downloadToken),
  };
}

export async function finalizeIntakePhotoUpload(input: {
  companyId: string;
  jobId: string;
  photoId: string;
  storagePath: string;
  downloadToken: string;
  contentType: string;
}): Promise<{ url: string; sizeBytes: number }> {
  const companyId = normalizeCompanyId(input.companyId);
  const expectedPrefix = `companies/${companyId}/engine-intake/${input.jobId}/${input.photoId}.`;
  if (!companyId || !input.storagePath.startsWith(expectedPrefix)) {
    throw new Error("Invalid intake photo storage path");
  }

  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(input.storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error("Uploaded intake photo was not found");
  }

  const [metadata] = await file.getMetadata();
  const sizeBytes = Number(metadata.size ?? 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Uploaded intake photo is empty");
  }
  if (sizeBytes > MAX_INTAKE_PHOTO_BYTES) {
    await file.delete({ ignoreNotFound: true });
    throw new Error("Uploaded intake photo exceeds the 25 MB limit");
  }

  await file.setMetadata({
    contentType: input.contentType,
    cacheControl: "private, max-age=86400",
    metadata: {
      firebaseStorageDownloadTokens: input.downloadToken,
    },
  });

  return {
    url: buildFirebaseStorageDownloadUrl(
      bucket.name,
      input.storagePath,
      input.downloadToken,
    ),
    sizeBytes,
  };
}
