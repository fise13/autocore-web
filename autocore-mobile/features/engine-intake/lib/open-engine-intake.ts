import type { Href } from 'expo-router';

import { navigationHrefKey } from '@/lib/navigation/href-key';
import { stackNavigationGuard } from '@/lib/navigation/stack-navigation-guard';

type IntakeRouter = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  navigate: (href: Href) => void;
  dismissTo?: (href: Href) => void;
};

const INTAKE_BAY = '/intake' as Href;

/**
 * Open the Engine intake bay without stacking duplicate screens.
 * Prefer `navigate` (reuses an existing stack entry) over `push`.
 */
export function openEngineIntakeBay(router: IntakeRouter): void {
  const key = navigationHrefKey(INTAKE_BAY);
  stackNavigationGuard.tryPush(key, () => {
    if (typeof router.dismissTo === 'function') {
      try {
        router.dismissTo(INTAKE_BAY);
        return;
      } catch {
        // Fall through when dismissTo cannot target this route.
      }
    }
    router.navigate(INTAKE_BAY);
  });
}

/**
 * Open a capture session. Uses navigate so reopening the same job does not
 * push another `/intake/[jobId]` on top of an existing one.
 */
export function openEngineIntakeSession(
  router: IntakeRouter,
  jobId: string,
  sessionId: string,
): void {
  const href = {
    pathname: '/intake/[jobId]',
    params: { jobId, sessionId },
  } as unknown as Href;
  const key = navigationHrefKey(href);
  stackNavigationGuard.tryPush(key, () => {
    router.navigate(href);
  });
}
