import "server-only";

import { randomUUID } from "node:crypto";

import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildFirebaseStorageDownloadUrl } from "@/lib/company/upload-company-logo-utils";
import {
  assertRowPhotoUpload,
  buildRowPhotoStoragePath,
  type RowPhotoEntityKind,
} from "@/lib/grid/upload-row-photo-utils";

export {
  assertRowPhotoUpload,
  isRowPhotoEntityKind,
  isVideoContentType,
  isVideoMediaUrl,
  MAX_ROW_MEDIA_ITEMS,
} from "@/lib/grid/upload-row-photo-utils";

export async function uploadRowPhotoAdmin(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  buffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ url: string; storagePath: string }> {
  const companyId = normalizeCompanyId(input.companyId);
  const entityId = input.entityId.trim();
  if (!companyId || !entityId) {
    throw new Error("companyId and entityId are required");
  }

  const fileId = randomUUID();
  const storagePath = buildRowPhotoStoragePath(
    companyId,
    input.entityKind,
    entityId,
    fileId,
    input.extension,
  );
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await file.save(input.buffer, {
    contentType: input.contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return {
    url: buildFirebaseStorageDownloadUrl(bucket.name, storagePath, downloadToken),
    storagePath,
  };
}

/** Direct-to-Storage upload for large photos/videos (avoids Vercel body limits). */
export async function prepareRowMediaUpload(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  contentType: string;
  extension: string;
}): Promise<{ uploadUrl: string; storagePath: string; url: string; downloadToken: string }> {
  const companyId = normalizeCompanyId(input.companyId);
  const entityId = input.entityId.trim();
  if (!companyId || !entityId) {
    throw new Error("companyId and entityId are required");
  }

  const fileId = randomUUID();
  const downloadToken = randomUUID();
  const storagePath = buildRowPhotoStoragePath(
    companyId,
    input.entityKind,
    entityId,
    fileId,
    input.extension,
  );
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);

  // Seed metadata so Firebase download URLs work after the client PUT.
  await file.save(Buffer.alloc(0), {
    contentType: input.contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: input.contentType,
  });

  return {
    uploadUrl,
    storagePath,
    downloadToken,
    url: buildFirebaseStorageDownloadUrl(bucket.name, storagePath, downloadToken),
  };
}

export async function finalizeRowMediaUpload(input: {
  companyId: string;
  storagePath: string;
  downloadToken: string;
  contentType: string;
}): Promise<{ url: string }> {
  const companyId = normalizeCompanyId(input.companyId);
  const storagePath = input.storagePath.trim();
  if (!companyId || !storagePath.startsWith(`companies/${companyId}/row-photos/`)) {
    throw new Error("Invalid storage path");
  }

  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error("Upload not found");
  }

  await file.setMetadata({
    contentType: input.contentType,
    cacheControl: "public, max-age=31536000, immutable",
    metadata: {
      firebaseStorageDownloadTokens: input.downloadToken,
    },
  });

  return {
    url: buildFirebaseStorageDownloadUrl(bucket.name, storagePath, input.downloadToken),
  };
}

export function validateRowPhotoFile(file: { size: number; type: string; name?: string }) {
  return assertRowPhotoUpload(file);
}

/** Deletes row-photo objects; missing files are ignored. */
export async function deleteRowPhotosAdmin(input: {
  companyId: string;
  storagePaths: string[];
}): Promise<{ deleted: number }> {
  const companyId = normalizeCompanyId(input.companyId);
  const prefix = `companies/${companyId}/row-photos/`;
  const unique = [
    ...new Set(
      input.storagePaths
        .map((path) => path.trim())
        .filter((path) => path.startsWith(prefix)),
    ),
  ];
  if (unique.length === 0) return { deleted: 0 };

  const bucket = await resolveAdminStorageBucket();
  let deleted = 0;
  await Promise.all(
    unique.map(async (storagePath) => {
      try {
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
        deleted += 1;
      } catch {
        // Best-effort cleanup; Firestore already dropped the URL.
      }
    }),
  );
  return { deleted };
}
