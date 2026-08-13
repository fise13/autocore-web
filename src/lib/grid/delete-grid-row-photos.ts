import { getFirebaseAuth } from "@/infrastructure/firebase/client";

/** Best-effort Storage cleanup for row media URLs removed from inventory grids. */
export async function deleteGridRowPhotos(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const user = getFirebaseAuth().currentUser;
  if (!user) return;
  const token = await user.getIdToken();

  const response = await fetch("/api/inventory/row-photo/file", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: unique }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "Failed to delete media");
  }
}
