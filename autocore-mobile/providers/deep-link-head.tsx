import { useEffect, useSyncExternalStore } from 'react';
import { useRootNavigationState, useRouter, type Href } from 'expo-router';

import {
  consumePendingDeepLink,
  getPendingDeepLink,
  subscribePendingDeepLink,
} from '@/lib/deep-links/pending-deep-link';
import { deepLinkTargetToPath } from '@/lib/deep-links/canonical-deep-links';
import { openEngineIntakeBay } from '@/features/engine-intake/lib/open-engine-intake';
import { guardedPush } from '@/lib/navigation/guarded-push';

/**
 * Replays a Universal Link once the app tree is actually live.
 *
 * Mounted inside the authenticated tree, so by the time it renders the session
 * is restored, the company is resolved and `AuthRedirectEffect` has already put
 * the shell on screen — the deep link lands on top of a real tab instead of
 * racing it. Cold start, warm start and post-login all take this same path.
 */
export function DeepLinkHead() {
  const router = useRouter();
  const rootState = useRootNavigationState();
  const navigationReady = Boolean(rootState?.key);

  const pending = useSyncExternalStore(
    subscribePendingDeepLink,
    getPendingDeepLink,
    getPendingDeepLink,
  );

  useEffect(() => {
    if (!navigationReady || !pending) return;

    const link = consumePendingDeepLink();
    if (!link) return;

    // Intake has its own opener that reuses an existing stack entry instead of
    // pushing a second copy — repeated taps must not build a stack of bays.
    if (link.pathname === '/intake') {
      openEngineIntakeBay(router);
      return;
    }

    // `guardedPush` dedupes by href, so a link tapped twice (or delivered on
    // both cold start and a resume) navigates once.
    guardedPush(router, deepLinkTargetToPath(link) as Href);
  }, [navigationReady, pending, router]);

  return null;
}
