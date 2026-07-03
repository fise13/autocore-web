const MAX_INLINE_AVATAR_CHARS = 256_000;

/** RN Image can fail on very large Firestore data-URL avatars from web upload fallback. */
export function sanitizeUserPhotoUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:') && trimmed.length > MAX_INLINE_AVATAR_CHARS) {
    return null;
  }
  return trimmed;
}
