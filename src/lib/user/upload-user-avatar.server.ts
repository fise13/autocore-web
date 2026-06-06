import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resetResolvedStorageBucket, resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";
import {
  buildFirebaseStorageDownloadUrl,
  isStorageBucketMissingError,
} from "@/lib/company/upload-company-logo-utils";

const MAX_FIRESTORE_AVATAR_BYTES = 900_000;

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function uploadUserAvatarToStorage(
  uid: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const storagePath = `users/${uid}/avatar.${extension}`;
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

async function uploadUserAvatarToFirestore(uid: string, buffer: Buffer, contentType: string): Promise<string> {
  if (buffer.length > MAX_FIRESTORE_AVATAR_BYTES) {
    throw new Error(
      "Аватар слишком большой для сохранения без Storage. Включите Firebase Storage или загрузите файл меньшего размера.",
    );
  }

  const photoURL = bufferToDataUrl(buffer, contentType);

  await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .set(
      {
        photoURL,
        photoStorage: "firestore",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return photoURL;
}

export async function persistUserAvatar(
  uid: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<{ photoURL: string; storage: "cloud" | "firestore" }> {
  try {
    const photoURL = await uploadUserAvatarToStorage(uid, buffer, contentType, extension);
    return { photoURL, storage: "cloud" };
  } catch (error) {
    if (!isStorageBucketMissingError(error)) {
      throw error instanceof Error ? error : new Error("Не удалось загрузить аватар");
    }

    resetResolvedStorageBucket();
    const photoURL = await uploadUserAvatarToFirestore(uid, buffer, contentType);
    return { photoURL, storage: "firestore" };
  }
}

export async function saveUserAvatarReference(
  uid: string,
  photoURL: string,
  storage: "cloud" | "firestore",
): Promise<void> {
  const payload: Record<string, unknown> = {
    photoURL,
    photoStorage: storage,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (storage === "cloud") {
    payload.photoDataUrl = FieldValue.delete();
  }

  await getAdminFirestore().collection("users").doc(uid).set(payload, { merge: true });
}
