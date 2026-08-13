type SnapshotMeta = {
  fromCache: boolean;
  hasPendingWrites: boolean;
};

/**
 * RN Firestore has no durable cache. An offline listener therefore delivers
 * `fromCache + empty/missing` even when MMKV still holds last-known data.
 * Treating that as "the collection is empty / the employee was removed"
 * kicks the user out of the company and wipes catalogs.
 */
export function isUntrustedEmptyQuerySnapshot(snapshot: {
  empty: boolean;
  metadata: SnapshotMeta;
}): boolean {
  return snapshot.metadata.fromCache && snapshot.empty && !snapshot.metadata.hasPendingWrites;
}

export function isUntrustedMissingDocumentSnapshot(snapshot: {
  exists: (() => boolean) | boolean;
  metadata: SnapshotMeta;
}): boolean {
  const exists = typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
  return snapshot.metadata.fromCache && !exists && !snapshot.metadata.hasPendingWrites;
}
