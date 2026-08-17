/**
 * Holds a deep link that arrived before the app could act on it.
 *
 * A Universal Link tapped on a cold start reaches JS long before Firebase has
 * restored the session, and `AuthRedirectEffect` replaces the route as soon as
 * it does — so a link routed eagerly is simply overwritten and lost. The link
 * parks here instead and `DeepLinkHead` replays it once the app tree is live.
 *
 * Module-level store rather than React state: `+native-intent` runs outside the
 * component tree, before any provider has mounted.
 */

import type { DeepLinkTarget } from './canonical-deep-links';

type Listener = () => void;

/**
 * A parked link is a user intent, and intents go stale. Long enough to cover
 * "tap link → sign in → land on the screen", short enough that a link tapped
 * yesterday does not yank today's session somewhere unexpected.
 */
const PENDING_TTL_MS = 15 * 60 * 1000;

let pending: { target: DeepLinkTarget; at: number } | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function readFresh(): DeepLinkTarget | null {
  if (!pending) return null;
  if (Date.now() - pending.at > PENDING_TTL_MS) {
    pending = null;
    return null;
  }
  return pending.target;
}

/** Park a link until the session is ready. A newer link replaces an older one. */
export function rememberPendingDeepLink(target: DeepLinkTarget): void {
  pending = { target, at: Date.now() };
  emit();
}

export function getPendingDeepLink(): DeepLinkTarget | null {
  return readFresh();
}

/** Read and clear in one step so two subscribers cannot navigate twice. */
export function consumePendingDeepLink(): DeepLinkTarget | null {
  const current = readFresh();
  if (pending) {
    pending = null;
    emit();
  }
  return current;
}

/** Sign-out drops any parked link — it belongs to the previous session. */
export function clearPendingDeepLink(): void {
  if (!pending) return;
  pending = null;
  emit();
}

export function subscribePendingDeepLink(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
