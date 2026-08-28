/**
 * One number for how many photos this engine actually has.
 *
 * Two sources describe the same shots and neither is complete on its own: the
 * job document the server keeps, and the outbox rows still on the phone. Naively
 * adding them double-counts every photo the server has already been told about
 * but whose bytes are still going up — which on a yard connection is most of
 * them, for minutes at a time. Three shutter presses read as "5 photos".
 *
 * The overlap is knowable exactly: `prepare` returns a server photo id, and a
 * row that has one is already inside the server's count. So the sum is
 * "everything the server counts" plus "only the rows it has never heard of",
 * with a `max` on the first term so a lagging Firestore snapshot cannot make
 * the number dip while the worker is looking at it.
 *
 * Pure — no React Native.
 */

export type CountableIntakePhoto = {
  status: string;
  state?: string;
  lastError?: string | null;
  errorInfo?: { code?: string } | null;
  /**
   * The id `prepare` minted for this row, once it has one.
   *
   * Its presence — not its value — is what matters here: it is the proof that
   * the server has a photo document for this shot and is already counting it.
   */
  serverPhotoId?: string | null;
};

/** Duplicate finalize / already-uploaded — not a fifth shot. */
export function isIntakePhotoConflict(photo: CountableIntakePhoto): boolean {
  if (photo.errorInfo?.code === 'CONFLICT') return true;
  const message = `${photo.lastError ?? ''}`.toLowerCase();
  return message.includes('already on the server') || message.includes('already recorded');
}

export type VisibleIntakePhotoCount = {
  /** What the camera dock and list should read. */
  total: number;
  pending: number;
  failed: number;
  completed: number;
};

export function countVisibleIntakePhotos(input: {
  serverCaptured: number;
  photos: readonly CountableIntakePhoto[];
}): VisibleIntakePhotoCount {
  let pending = 0;
  let failed = 0;
  let completed = 0;
  /** Rows the server already has a document for. */
  let known = 0;
  /** Rows the server has never been told about. */
  let unknown = 0;

  for (const photo of input.photos) {
    if (isIntakePhotoConflict(photo)) continue;
    if (photo.serverPhotoId) known += 1;
    else unknown += 1;

    if (photo.status === 'failed' || photo.state === 'failed') {
      failed += 1;
      continue;
    }
    if (photo.status === 'completed') {
      completed += 1;
      continue;
    }
    pending += 1;
  }

  const serverCaptured = Math.max(0, Math.trunc(input.serverCaptured));
  const total = Math.max(serverCaptured, known) + unknown;
  return { total, pending, failed, completed };
}
