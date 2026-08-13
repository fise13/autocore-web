/**
 * Naming a downloaded engine photo.
 *
 * Kept free of `expo-file-system` / `expo-sharing` so the parsing rules below
 * are unit-testable — importing either of those pulls in React Native and the
 * node test runner cannot load it.
 */

export const PHOTO_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
};

export const PHOTO_UTI_BY_EXTENSION: Record<string, string> = {
  jpg: 'public.jpeg',
  jpeg: 'public.jpeg',
  png: 'public.png',
  heic: 'public.heic',
  heif: 'public.heic',
  webp: 'org.webmproject.webp',
};

/**
 * Firebase Storage URLs carry the real object path percent-encoded inside
 * `/o/`, followed by `?alt=media&token=…`, so the extension cannot be read off
 * the raw URL — decode the pathname and ignore the query.
 */
export function photoExtension(url: string): string {
  try {
    const parsed = new URL(url);
    const decoded = decodeURIComponent(parsed.pathname);
    const match = /\.([a-z0-9]{2,5})$/i.exec(decoded);
    const extension = match?.[1]?.toLowerCase();
    return extension && extension in PHOTO_MIME_BY_EXTENSION ? extension : 'jpg';
  } catch {
    return 'jpg';
  }
}

/** `EJ257-12345-2.jpg` — recognisable in Files without opening it. */
export function buildEnginePhotoFilename(
  serial: string,
  index: number,
  url: string,
): string {
  const safeSerial = serial.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'engine';
  return `${safeSerial}-${index + 1}.${photoExtension(url)}`;
}
