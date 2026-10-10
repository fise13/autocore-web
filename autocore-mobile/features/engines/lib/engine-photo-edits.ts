/**
 * Photo list edits for an engine. The first URL is the main photo — the one the
 * catalog row, the hero and shared links show — so "make main" is a move to
 * the front. Pure, for node tests.
 */

/** Same ceiling the server enforces for row media (`MAX_ROW_MEDIA_ITEMS`). */
export const MAX_ENGINE_PHOTOS = 40;

function clean(urls: readonly string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean);
}

export function photosRoomLeft(current: readonly string[]): number {
  return Math.max(0, MAX_ENGINE_PHOTOS - clean(current).length);
}

export function withAddedPhotos(current: readonly string[], added: readonly string[]): string[] {
  const next = clean(current);
  for (const url of clean(added)) {
    if (next.length >= MAX_ENGINE_PHOTOS) break;
    if (!next.includes(url)) next.push(url);
  }
  return next;
}

export function withMainPhoto(current: readonly string[], index: number): string[] {
  const next = clean(current);
  if (index <= 0 || index >= next.length) return next;
  const [main] = next.splice(index, 1);
  return [main!, ...next];
}

export function withoutPhoto(current: readonly string[], index: number): string[] {
  const next = clean(current);
  if (index < 0 || index >= next.length) return next;
  next.splice(index, 1);
  return next;
}
