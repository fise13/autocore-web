import type { Href } from 'expo-router';

import { navigationHrefKey } from '@/lib/navigation/href-key';
import { stackNavigationGuard } from '@/lib/navigation/stack-navigation-guard';
import { openEnginesList } from '@/features/engines/navigation';
import {
  parseEngineListFilter,
  type EngineListFilter,
} from '@/features/engines/lib/engine-lane';

type IntakeRouter = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  navigate: (href: Href) => void;
  dismissTo?: (href: Href) => void;
};

/** @deprecated Intake bay filters — mapped onto Engines Incoming / All. */
export type IntakeBayFilter = 'active' | 'ready' | 'all';

function enginesFilterFromBay(filter?: IntakeBayFilter): EngineListFilter | undefined {
  if (!filter) return 'incoming';
  return parseEngineListFilter(filter) ?? 'incoming';
}

/**
 * Opens Engines (Incoming by default). Kept so widgets, Live Activities, and
 * leftover `/intake` links do not need a native rebuild.
 */
export function openEngineIntakeBay(
  router: IntakeRouter,
  options?: { filter?: IntakeBayFilter },
): void {
  openEnginesList(router, { filter: enginesFilterFromBay(options?.filter) });
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
