/**
 * The `prepare` answer, kept on the outbox row.
 *
 * Everything a photo needs in order to be handed to the iOS background
 * URLSession is minted by `prepare`: a v4 signed URL, the storage path, the
 * download token, the content type. Before this it lived only in the local
 * variable of the transfer that fetched it, so the one thing the phone could
 * not do was start a PUT without first completing a round-trip — and a
 * round-trip is exactly what does not survive the app being suspended.
 *
 * Persisting it inverts that: a photo that has been primed while the person was
 * still looking at the camera can be handed to the daemon during the ~30s
 * `beginBackgroundTask` window with no network dependency at all.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type PreparedIntakeUpload = {
  /** The server's photo document id. */
  serverPhotoId: string;
  /** v4 signed URL for the PUT. Empty when `prepare` said the bytes are already up. */
  uploadUrl: string;
  storagePath: string;
  downloadToken: string;
  contentType: string;
  /** Byte length the PUT will send — finalize is validated against it. */
  sizeBytes: number;
  /** Download URL the server will serve this photo from once finalized. */
  url: string;
  /** When the signed URL stops being accepted (ISO). */
  expiresAt: string;
};

/** How long `prepareIntakePhotoUpload` signs an upload URL for. */
export const PREPARED_UPLOAD_TTL_MS = 15 * 60 * 1_000;

/**
 * Margin against a PUT that starts just before its URL dies.
 *
 * A signed URL is checked at request time, not per byte, so this only has to
 * cover the gap between deciding to reuse the credentials and the daemon
 * opening the connection.
 */
export const PREPARED_UPLOAD_SAFETY_MS = 60 * 1_000;

export function preparedUploadExpiresAt(now: Date): string {
  return new Date(now.getTime() + PREPARED_UPLOAD_TTL_MS).toISOString();
}

/** Whether these credentials can still start a PUT without re-preparing. */
export function isPreparedUploadUsable(
  prepared: Pick<PreparedIntakeUpload, 'uploadUrl' | 'expiresAt'> | null | undefined,
  now: Date,
): boolean {
  if (!prepared?.uploadUrl) return false;
  const expiresAt = Date.parse(prepared.expiresAt);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt - PREPARED_UPLOAD_SAFETY_MS > now.getTime();
}

type PreparedUploadFields = {
  prepared: PreparedIntakeUpload | null;
  putStartedAt: string | null;
};

/**
 * Rows written before these fields existed.
 *
 * `null` is the safe answer for both: an unknown row simply takes the ordinary
 * prepare → PUT → finalize path, which is idempotent on the server.
 */
export function withPreparedUploadDefaults<T extends Partial<PreparedUploadFields>>(
  row: T,
): T & PreparedUploadFields {
  return {
    ...row,
    prepared: row.prepared ?? null,
    putStartedAt: row.putStartedAt ?? null,
  };
}
