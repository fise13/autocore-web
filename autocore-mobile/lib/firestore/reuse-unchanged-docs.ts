/**
 * Map a query snapshot to entities, re-parsing only documents that changed.
 *
 * A listener used to rebuild every entity on every snapshot: one edited motor
 * meant 10,000 documents parsed again, 10,000 new objects, and every cache or
 * memo keyed on them thrown away downstream. Unchanged documents now keep the
 * object they had, so identity-based caches (search text, grouping, React memo)
 * survive realtime updates.
 *
 * `docs` is the full current result and decides what exists; `docChanges()` only
 * says which of those must be re-parsed. That keeps the result correct even when
 * a snapshot was skipped (an untrusted empty cache read): the next snapshot
 * reports every present doc as added, so nothing stale is reused.
 *
 * Pure — the Firestore types are structural so the node test runner can load it.
 */

type DocLike = { id: string; ref: { path: string }; data: (...args: never[]) => unknown };
type SnapshotLike = {
  docs: readonly DocLike[];
  docChanges: () => readonly { type: string; doc: { ref: { path: string } } }[];
};

export type DocEntityCache<T> = Map<string, T | null>;

export function reuseUnchangedDocs<T>(
  snapshot: SnapshotLike,
  previous: DocEntityCache<T>,
  map: (id: string, data: Record<string, unknown>) => T | null,
  /** How to read a changed doc, e.g. with `{ serverTimestamps: 'estimate' }`. */
  read: (doc: DocLike) => Record<string, unknown> = (doc) => doc.data() as Record<string, unknown>,
): { cache: DocEntityCache<T>; entities: T[] } {
  const changed = new Set<string>();
  for (const change of snapshot.docChanges()) {
    if (change.type !== 'removed') changed.add(change.doc.ref.path);
  }

  const cache: DocEntityCache<T> = new Map();
  const entities: T[] = [];
  for (const doc of snapshot.docs) {
    const key = doc.ref.path;
    const entity =
      !changed.has(key) && previous.has(key) ? previous.get(key)! : map(doc.id, read(doc));
    cache.set(key, entity);
    if (entity !== null) entities.push(entity);
  }
  return { cache, entities };
}

/** Same length, same objects in the same order — nothing for a screen to redo. */
export function sameItems<T>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
