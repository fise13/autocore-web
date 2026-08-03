/** Reserved data keys for injected Quality / Photo columns (not part of canonical 7-slot mapping). */
export const SPECIFIC_QUALITY_KEY = "Quality";
export const SPECIFIC_PHOTO_URLS_KEY = "_photoUrls";

export function parseSpecificPhotoUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // fall through — treat as newline-separated
  }
  return raw
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function serializeSpecificPhotoUrls(urls: string[]): string {
  return JSON.stringify(urls.filter(Boolean));
}
