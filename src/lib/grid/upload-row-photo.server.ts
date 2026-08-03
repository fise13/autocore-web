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

export { assertRowPhotoUpload, isRowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";

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

export function validateRowPhotoFile(file: { size: number; type: string; name?: string }) {
  return assertRowPhotoUpload(file);
}
