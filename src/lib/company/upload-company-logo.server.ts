import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket, resetResolvedStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  assertLogoUpload,
  buildFirebaseStorageDownloadUrl,
  isStorageBucketMissingError,
} from "@/lib/company/upload-company-logo-utils";

export {
  assertLogoUpload,
  buildFirebaseStorageDownloadUrl,
  inferLogoContentType,
} from "@/lib/company/upload-company-logo-utils";

const MAX_FIRESTORE_LOGO_BYTES = 900_000;

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function uploadCompanyLogoToStorage(
  companyId: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const storagePath = `companies/${normalizedCompanyId}/branding/logo.${extension}`;
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return buildFirebaseStorageDownloadUrl(bucket.name, storagePath, downloadToken);
}

async function uploadCompanyLogoToFirestore(
  companyId: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (buffer.length > MAX_FIRESTORE_LOGO_BYTES) {
    throw new Error(
      "Логотип слишком большой для сохранения без Storage. Включите Firebase Storage или загрузите файл меньшего размера.",
    );
  }

  const normalizedCompanyId = normalizeCompanyId(companyId);
  const logoDataUrl = bufferToDataUrl(buffer, contentType);

  await getAdminFirestore()
    .collection("companies")
    .doc(normalizedCompanyId)
    .set(
      {
        logoUrl: logoDataUrl,
        logoStorage: "firestore",
        logoDataUrl: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return logoDataUrl;
}

export async function persistCompanyLogo(
  companyId: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<{ logoUrl: string; storage: "cloud" | "firestore" }> {
  try {
    const logoUrl = await uploadCompanyLogoToStorage(companyId, buffer, contentType, extension);
    return { logoUrl, storage: "cloud" };
  } catch (error) {
    if (!isStorageBucketMissingError(error)) {
      throw error instanceof Error ? error : new Error("Не удалось загрузить логотип");
    }

    resetResolvedStorageBucket();
    const logoUrl = await uploadCompanyLogoToFirestore(companyId, buffer, contentType);
    return { logoUrl, storage: "firestore" };
  }
}

export async function uploadCompanyLogoAdmin(
  companyId: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const result = await persistCompanyLogo(companyId, buffer, contentType, extension);
  return result.logoUrl;
}

export async function saveCompanyLogoReference(
  companyId: string,
  logoUrl: string,
  storage: "cloud" | "firestore",
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const payload: Record<string, unknown> = {
    logoUrl,
    logoStorage: storage,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (storage !== "firestore") {
    payload.logoDataUrl = FieldValue.delete();
  }

  await getAdminFirestore().collection("companies").doc(normalizedCompanyId).set(payload, { merge: true });
}
