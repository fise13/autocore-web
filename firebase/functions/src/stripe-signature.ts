import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe webhook signature verification.
 *
 * Deliberately dependency-free — only `node:crypto` — so it can be unit tested
 * from the repo root without pulling in `firebase-functions`. This is the only
 * thing standing between the billing collection and anyone who can POST to the
 * webhook URL, so it is the part that most needs tests.
 *
 * Scheme: the header carries `t=<unix>` plus one or more `v1=<hex>` signatures.
 * The signed payload is `${t}.${rawBody}` and the signature is HMAC-SHA256 with
 * the endpoint secret. Multiple `v1` values appear during secret rotation, so
 * any match is accepted.
 */

/** Stripe's own default tolerance for replayed payloads, in seconds. */
export const SIGNATURE_TOLERANCE_SEC = 300;

function hexEquals(a: string, b: string): boolean {
  // Length is compared first because timingSafeEqual throws on a mismatch.
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export type StripeSignatureInput = {
  /**
   * The exact bytes Stripe sent. Re-serialising parsed JSON changes key order
   * and whitespace, and the HMAC will not match.
   */
  rawBody: Buffer;
  signatureHeader: string;
  secret: string;
  /** Injectable for tests; defaults to now. */
  nowSec?: number;
  toleranceSec?: number;
};

export function verifyStripeSignature(input: StripeSignatureInput): boolean {
  const parts = input.signatureHeader.split(",").map((part) => part.trim());

  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const candidates = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter((value) => value.length > 0);

  if (!timestamp || candidates.length === 0) return false;

  const sentSec = Number(timestamp);
  if (!Number.isFinite(sentSec)) return false;

  // Reject stale payloads so a captured request cannot be replayed later.
  const nowSec = input.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSec ?? SIGNATURE_TOLERANCE_SEC;
  if (Math.abs(nowSec - sentSec) > tolerance) return false;

  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, "utf8"),
    input.rawBody,
  ]);
  const expected = createHmac("sha256", input.secret).update(signedPayload).digest("hex");

  return candidates.some((candidate) => hexEquals(candidate, expected));
}

/** Build a valid header. Exported for tests; mirrors what Stripe sends. */
export function signStripePayload(params: {
  rawBody: Buffer;
  secret: string;
  timestampSec: number;
}): string {
  const signedPayload = Buffer.concat([
    Buffer.from(`${params.timestampSec}.`, "utf8"),
    params.rawBody,
  ]);
  const signature = createHmac("sha256", params.secret).update(signedPayload).digest("hex");
  return `t=${params.timestampSec},v1=${signature}`;
}
