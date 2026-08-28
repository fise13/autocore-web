/**
 * What to do with a photo once `prepare` has answered.
 *
 * `prepare` is idempotent and reports one of three situations, which the client
 * has to tell apart:
 *
 *  - nothing is on the server yet — PUT the bytes, then finalize;
 *  - the bytes are in Storage but the photo row is not finished — finalize only
 *    (the iOS background URLSession outlives the app, so a PUT routinely
 *    survives a kill that the finalize request does not);
 *  - the photo is completely done — there is nothing left to do.
 *
 * Conflating the last two cost a worker their photos. `prepare` answered the
 * finished case with an empty `downloadToken`, because a finished photo has no
 * pending upload to describe; the client finalized anyway; and the finalize
 * schema requires a non-empty token, so the server replied 400 "Invalid intake
 * photo finalization". That is a non-retryable code, so the row went red and
 * stayed red — over a photo that was already safely stored. The camera showed
 * a zod validation label to somebody standing over an engine.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type PreparedPhotoResponse = {
  /** The photo document is complete on the server. */
  alreadyFinalized?: boolean;
  /** The bytes are in Storage; the document may still need finishing. */
  alreadyUploaded?: boolean;
  url?: string;
  uploadUrl?: string;
  downloadToken?: string;
};

export type PreparedPhotoStep =
  /** Done. Drop the local row and keep this URL. */
  | { step: 'settle'; url: string }
  /** Bytes are there; ask the server to finish the row. */
  | { step: 'finalize' }
  /** Send the bytes first. */
  | { step: 'upload' };

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function resolvePreparedPhotoStep(
  prepared: PreparedPhotoResponse,
): PreparedPhotoStep {
  const url = trimmed(prepared.url);

  if (prepared.alreadyFinalized && url) {
    return { step: 'settle', url };
  }

  // An older server that predates `alreadyFinalized` still describes the
  // finished case the same way: uploaded, with a URL, and no token to finalize
  // against. Reading that as "settle" is what makes the phone safe to ship
  // ahead of the web deploy.
  if (prepared.alreadyUploaded && url && !trimmed(prepared.downloadToken)) {
    return { step: 'settle', url };
  }

  // `alreadyFinalized` implies the bytes are there, whether or not the server
  // also said so. Without a URL to keep there is still something to ask for,
  // and finalize is idempotent — it answers with the stored URL.
  if (prepared.alreadyUploaded || prepared.alreadyFinalized) {
    return { step: 'finalize' };
  }

  return { step: 'upload' };
}
