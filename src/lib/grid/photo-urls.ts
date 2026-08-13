/** Serialize row media URLs for grid undo / clear (one URL per line). */
export function serializeGridPhotoUrls(urls: string[] | null | undefined): string {
  return (urls ?? []).map((url) => url.trim()).filter(Boolean).join("\n");
}

export function parseGridPhotoUrls(value: string): string[] {
  if (!value.trim()) return [];
  return value.split("\n").map((part) => part.trim()).filter(Boolean);
}
