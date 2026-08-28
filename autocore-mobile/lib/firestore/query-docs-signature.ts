/**
 * Cheap identity for a Firestore query snapshot.
 * Two callbacks with the same doc ids + update times are the same data —
 * including the cache-then-server double fire when nothing changed.
 */
export function queryDocsSignature(
  docs: readonly { id: string; version: number }[],
): string {
  if (docs.length === 0) return '';
  return docs.map((doc) => `${doc.id}:${doc.version}`).join('|');
}
