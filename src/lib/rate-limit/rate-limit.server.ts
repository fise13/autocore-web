import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";

/**
 * General fixed-window rate limiter for expensive endpoints.
 *
 * Rate limiting existed only on five auth and invite routes. The costly ones
 * had none: the AI assistant (120s budget, up to 10 tool-calling steps, billed
 * OpenRouter tokens), PDF generation (60s, spawns Chromium), and an
 * unauthenticated support endpoint that accepts a 15MB attachment and sends
 * mail through Resend. Any one of those could be driven in a loop.
 *
 * Fixed windows are used rather than a sliding log because the failure being
 * prevented is sustained abuse, not precise burst shaping — and a fixed window
 * costs one document read/write instead of one per request in the window.
 *
 * Counters live in `rateLimits/{key}` and are only ever written by the Admin
 * SDK, so no client rule change is needed.
 */

export class RateLimitError extends Error {
  retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSec}s.`);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export type RateLimitRule = {
  /** Stable identifier for the limited action, e.g. "assistant". */
  action: string;
  /** Who is being limited — a uid, companyId, or IP. */
  subject: string;
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
};

/** Firestore document ids may not contain "/" — flatten anything caller-supplied. */
function documentKey(action: string, subject: string): string {
  return `${action}:${subject}`.replace(/\//g, "_").slice(0, 1500);
}

/**
 * Consumes one unit against the rule, throwing `RateLimitError` when exhausted.
 *
 * Runs in a transaction so parallel requests cannot both read the same count
 * and each decide they are under the limit.
 */
export async function enforceRateLimit(rule: RateLimitRule): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("rateLimits").doc(documentKey(rule.action, rule.subject));

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const now = Date.now();

    const data = snap.data();
    const rawStart = data?.windowStartedAt;
    const windowStartedAt =
      rawStart instanceof Timestamp ? rawStart.toMillis() : null;
    const count = typeof data?.count === "number" ? data.count : 0;

    const windowIsOpen =
      windowStartedAt !== null && now - windowStartedAt < rule.windowMs;

    if (!windowIsOpen) {
      transaction.set(
        ref,
        {
          count: 1,
          windowStartedAt: Timestamp.fromMillis(now),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    if (count >= rule.limit) {
      const elapsed = now - (windowStartedAt ?? now);
      throw new RateLimitError(Math.max(1, Math.ceil((rule.windowMs - elapsed) / 1000)));
    }

    transaction.set(
      ref,
      { count: count + 1, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
}

/**
 * Best-effort client IP for unauthenticated endpoints.
 *
 * `x-forwarded-for` is client-controllable in general, but on Vercel the
 * platform prepends the real peer address, so the first entry is trustworthy
 * here. Falls back to a constant bucket rather than failing open per-request.
 */
export function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
