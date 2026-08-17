import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Shared authorization for scheduled routes.
 *
 * The cron endpoints previously accepted only `POST` with an `x-cron-secret`
 * header, and nothing in the repository ever called them — `vercel.json`
 * declared no `crons` block and no scheduler existed in Firebase Functions. So
 * import batches never expired and notification rules never ran.
 *
 * Vercel Cron cannot send custom headers or a request body: it issues `GET`
 * with `Authorization: Bearer <CRON_SECRET>`. Both shapes are accepted here so
 * the platform scheduler works while any existing external caller keeps
 * working unchanged.
 */

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    // Never open in production: an unauthenticated scheduled route would let
    // anyone drive company-wide notification and expiry sweeps.
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("x-cron-secret")?.trim();
  if (header && safeEqual(header, secret)) return true;

  const bearer = bearerToken(request);
  if (bearer && safeEqual(bearer, secret)) return true;

  return false;
}
