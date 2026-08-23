"use client";

import { getUrlHost, getMarketingUrl } from "@/lib/site-urls";

/**
 * Cookie consent for analytics.
 *
 * A banner that does not actually gate anything is decoration, so this is the
 * switch the Google tag reads: nothing loads and no cookie is written until
 * someone chooses. That is the strict reading of consent — a visitor who
 * ignores the banner is not measured — which costs some data in exchange for
 * the banner meaning what it says.
 *
 * **Stored in a cookie on the shared parent domain, not `localStorage`.**
 * Marketing and the product are separate origins, so a `localStorage` answer on
 * `myautocore.com` was invisible on `app.myautocore.com` and the banner asked
 * the same person twice on the way from the landing page to signup. A cookie
 * scoped to `.myautocore.com` is read by both. Recording consent this way is
 * also the normal thing to do: a consent record is strictly necessary, so it
 * needs no consent of its own.
 */

const COOKIE_NAME = "autocore_cookie_consent";

/** A year: long enough not to nag, short enough that consent is periodically refreshed. */
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type ConsentState = "unknown" | "granted" | "denied";

const listeners = new Set<() => void>();

/**
 * Cached so `getConsent` is a synchronous, cheap read.
 * `useSyncExternalStore` calls it on every render and compares by value.
 */
let cached: ConsentState | null = null;

function parseCookie(source: string): ConsentState {
  for (const part of source.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (rawName.trim() !== COOKIE_NAME) continue;
    const value = rest.join("=").trim();
    if (value === "granted" || value === "denied") return value;
  }
  return "unknown";
}

/**
 * The `domain` attribute that makes one answer cover both hosts.
 *
 * Returns null when the page is not on the product's own domain — localhost, a
 * Vercel preview URL — where a `domain` attribute would be rejected outright
 * and silently drop the cookie.
 */
export function consentCookieDomain(hostname: string, sharedHost: string): string | null {
  if (!sharedHost) return null;
  const host = hostname.toLowerCase();
  const shared = sharedHost.toLowerCase();
  if (host === shared || host.endsWith(`.${shared}`)) return `.${shared}`;
  return null;
}

/** The `document.cookie` string for a choice. Pure, so the attributes are testable. */
export function buildConsentCookie(
  value: Exclude<ConsentState, "unknown">,
  hostname: string,
  sharedHost: string,
  secure: boolean,
): string {
  const domain = consentCookieDomain(hostname, sharedHost);
  return [
    `${COOKIE_NAME}=${value}`,
    "path=/",
    `max-age=${MAX_AGE_SECONDS}`,
    // Lax, not Strict: the answer must survive arriving from an ad click.
    "SameSite=Lax",
    ...(domain ? [`domain=${domain}`] : []),
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function getConsent(): ConsentState {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return "unknown";
  cached = parseCookie(document.cookie);
  return cached;
}

/** Server snapshot for `useSyncExternalStore` — always undecided, so the
 *  markup matches what the client renders before the cookie is read. */
export function getServerConsent(): ConsentState {
  return "unknown";
}

export function setConsent(next: Exclude<ConsentState, "unknown">): void {
  cached = next;
  try {
    document.cookie = buildConsentCookie(
      next,
      window.location.hostname,
      getUrlHost(getMarketingUrl()) ?? "",
      window.location.protocol === "https:",
    );
  } catch {
    // The in-memory value still holds for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
