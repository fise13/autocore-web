/**
 * Expo Router's system-link hook. Every URL that launches or resumes the app —
 * Universal Link, custom scheme, notification tap — passes through here before
 * the router sees it.
 *
 * Two outcomes:
 *  - public link (invite/join): rewritten to its Expo Router path and routed now;
 *  - anything requiring a session: parked in `pending-deep-link` and cancelled
 *    (`null`), so the router boots normally and `DeepLinkHead` navigates once
 *    the session is restored. That is what keeps a cold-start link from being
 *    overwritten by `AuthRedirectEffect`, and what stops a deep link from ever
 *    rendering a screen ahead of the auth gate.
 *
 * URLs that are not AutoCore links (Expo dev client, Google sign-in callbacks)
 * pass through untouched.
 */

import {
  deepLinkTargetToPath,
  isCanonicalWebUrl,
  resolveCanonicalDeepLink,
} from '@/lib/deep-links/canonical-deep-links';
import { rememberPendingDeepLink } from '@/lib/deep-links/pending-deep-link';

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    // Only claim our own HTTPS links here. `autocoremobile://` widget and
    // Live Activity URLs keep their existing owner so their behaviour is
    // unchanged; see services/notifications/deep-link-resolver.ts.
    if (!isCanonicalWebUrl(path)) return path;

    const link = resolveCanonicalDeepLink(path);
    // Claimed host, unclaimed path (e.g. an excluded browser-owned route):
    // boot normally instead of guessing a screen.
    if (!link) return null;

    if (!link.requiresAuth) return deepLinkTargetToPath(link);

    rememberPendingDeepLink(link);
    return null;
  } catch {
    // A malformed link must never stop the app from launching.
    return null;
  }
}
