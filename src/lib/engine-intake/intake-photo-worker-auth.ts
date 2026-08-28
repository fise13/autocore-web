import "server-only";

/**
 * The shared secret the Storage trigger presents when it finalizes a photo.
 *
 * This path has no user: the whole point is that it runs when the worker's app
 * is gone. So it cannot verify a Firebase ID token, and it must instead be
 * unreachable without the secret — an unauthenticated caller who could reach it
 * would be able to mark arbitrary photos synced in any company.
 */
export const INTAKE_PHOTO_WORKER_HEADER = "x-intake-photo-worker-key";

export function readIntakePhotoWorkerSecret(): string | null {
  const secret = process.env.INTAKE_PHOTO_WORKER_SECRET?.trim();
  return secret || null;
}

/** Constant-time-ish compare so the endpoint does not leak the secret by timing. */
function secretsMatch(presented: string, expected: string): boolean {
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < presented.length; index += 1) {
    diff |= presented.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

export function isIntakePhotoWorkerRequest(request: Request): boolean {
  const secret = readIntakePhotoWorkerSecret();
  if (!secret) return false;
  const presented = request.headers.get(INTAKE_PHOTO_WORKER_HEADER)?.trim();
  if (!presented) return false;
  return secretsMatch(presented, secret);
}
