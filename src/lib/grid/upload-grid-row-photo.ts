import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { RowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";

async function authHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** Uploads one image/video via signed Storage URL (supports large videos). */
export async function uploadGridRowPhoto(input: {
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

  const putResponse = await fetch(prepared.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": prepared.contentType || input.file.type || "application/octet-stream",
    },
    body: input.file,
  });
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
    // PUT succeeded — fall back to the precomputed download URL.
    if (prepared.url) return prepared.url;
    throw new Error(finalized.error || "Failed to finalize upload");
  }
  return finalized.url;
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
