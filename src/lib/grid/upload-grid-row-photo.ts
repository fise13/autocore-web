import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { RowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";

/** Stay under Vercel serverless request-body limits (~4.5 MB). */
const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

async function authHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** Multipart upload through our API (Admin SDK → Storage). Avoids browser→GCS CORS. */
async function uploadViaApi(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  file: File;
}): Promise<string> {
  const headers = await authHeaders();
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("entityKind", input.entityKind);
  formData.set("entityId", input.entityId);
  formData.set("companyId", input.companyId);

  const response = await fetch("/api/inventory/row-photo", {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Failed to upload media");
  }
  return payload.url;
}

/**
 * Direct-to-Storage via signed write URL (for large videos).
 * Requires bucket CORS allowing PUT from the app origin; otherwise falls back to API.
 */
async function uploadViaSignedUrl(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  file: File;
}): Promise<string> {
  const headers = await authHeaders();

  const prepareResponse = await fetch("/api/inventory/row-photo/prepare", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyId: input.companyId,
      entityKind: input.entityKind,
      entityId: input.entityId,
      fileName: input.file.name,
      contentType: input.file.type,
      size: input.file.size,
    }),
  });

  const prepared = (await prepareResponse.json().catch(() => ({}))) as {
    uploadUrl?: string;
    storagePath?: string;
    downloadToken?: string;
    url?: string;
    contentType?: string;
    error?: string;
  };
  if (!prepareResponse.ok || !prepared.uploadUrl || !prepared.storagePath || !prepared.downloadToken) {
    throw new Error(prepared.error || "Failed to prepare upload");
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": prepared.contentType || input.file.type || "application/octet-stream",
      },
      body: input.file,
    });
  } catch {
    // Typical on localhost when the Storage bucket has no CORS for PUT.
    throw new Error("STORAGE_CORS");
  }
  if (!putResponse.ok) {
    throw new Error("Failed to upload media to storage");
  }

  const finalizeResponse = await fetch("/api/inventory/row-photo/finalize", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyId: input.companyId,
      storagePath: prepared.storagePath,
      downloadToken: prepared.downloadToken,
      contentType: prepared.contentType || input.file.type,
    }),
  });

  const finalized = (await finalizeResponse.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!finalizeResponse.ok || !finalized.url) {
    if (prepared.url) return prepared.url;
    throw new Error(finalized.error || "Failed to finalize upload");
  }
  return finalized.url;
}

/** Uploads one image/video and returns a durable Firebase Storage download URL. */
export async function uploadGridRowPhoto(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  file: File;
}): Promise<string> {
  // Prefer API for typical photos — no browser→GCS CORS dependency.
  if (input.file.size <= DIRECT_UPLOAD_MAX_BYTES) {
    return uploadViaApi(input);
  }

  try {
    return await uploadViaSignedUrl(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Signed PUT blocked (CORS) or other Storage failure — try API if the platform allows.
    if (message === "STORAGE_CORS" || message.includes("Failed to upload media to storage")) {
      return uploadViaApi(input);
    }
    throw error;
  }
}

export async function uploadGridRowPhotos(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  files: File[];
  onProgress?: (done: number, total: number) => void;
}): Promise<string[]> {
  const urls: string[] = [];
  let done = 0;
  for (const file of input.files) {
    const url = await uploadGridRowPhoto({
      companyId: input.companyId,
      entityKind: input.entityKind,
      entityId: input.entityId,
      file,
    });
    urls.push(url);
    done += 1;
    input.onProgress?.(done, input.files.length);
  }
  return urls;
}
