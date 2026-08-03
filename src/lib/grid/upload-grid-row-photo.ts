import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { RowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";

export async function uploadGridRowPhoto(input: {
  companyId: string;
  entityKind: RowPhotoEntityKind;
  entityId: string;
  file: File;
}): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("entityKind", input.entityKind);
  formData.set("entityId", input.entityId);
  formData.set("companyId", input.companyId);

  const response = await fetch("/api/inventory/row-photo", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Failed to upload photo");
  }
  return payload.url;
}
