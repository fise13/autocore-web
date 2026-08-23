"use client";

/**
 * Cookie consent for analytics.
 *
 * A banner that does not actually gate anything is decoration, so this is the
 * switch the Google tag reads: nothing loads and no cookie is written until
 * someone chooses. That is the strict reading of consent — a visitor who
 * ignores the banner is not measured — which costs some data in exchange for
 * the banner meaning what it says.
 *
 * The choice is kept in `localStorage`, not a cookie: storing the answer to
 * "may we store cookies" in a cookie is the kind of joke that ends up in a
 * complaint.
 */

const STORAGE_KEY = "autocore:cookie-consent:v1";

export type ConsentState = "unknown" | "granted" | "denied";

const listeners = new Set<() => void>();

/**
 * Cached so `getConsent` is a synchronous, allocation-free read.
 * `useSyncExternalStore` calls it on every render and compares by value.
 */
let cached: ConsentState | null = null;

function readStored(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "granted" || raw === "denied" ? raw : "unknown";
  } catch {
    // Private mode or blocked storage: treat as undecided rather than crashing.
    return "unknown";
  }
}

export function getConsent(): ConsentState {
  if (cached === null) cached = readStored();
  return cached;
}

/** Server snapshot for `useSyncExternalStore` — always undecided, so the
 *  markup matches what the client renders before storage is read. */
export function getServerConsent(): ConsentState {
  return "unknown";
}

export function setConsent(next: Exclude<ConsentState, "unknown">): void {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
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
