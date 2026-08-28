/**
 * Running a Home quick action.
 *
 * The view model says *what* to do; this says *how*, and it is deliberately the
 * only place on Home that knows a route exists. Two of the commands never touch
 * navigation at all — resuming reopens a session this phone already holds, and
 * retrying pushes files off it — so the section can no longer degrade into a
 * strip of links by accident: adding one would mean adding a command kind, and
 * there is no kind that means "go to a screen".
 */
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { toast } from '@/components/ui';
import { openEngineIntakeSession } from '@/features/engine-intake/lib/open-engine-intake';
import {
  drainIntakeOutbox,
  getCompanyIntakeOutboxSnapshot,
  resolveFailedIntakeOutbox,
} from '@/features/engine-intake/store/intake-outbox';
import { useSession } from '@/hooks/use-session';
import { haptics } from '@/theme/haptics';

import type { HomeQuickAction, HomeQuickActionCommand, HomeQuickActionId } from './types';

/**
 * Composers, not sections. Each of these is a form sheet that exists to create
 * one record and dismiss — the same surface the dock's (+) raises.
 */
const COMPOSER_ROUTES: Record<
  Extract<HomeQuickActionCommand, { kind: 'compose' }>['entity'],
  string
> = {
  engine: '/objects/new',
  order: '/orders/new',
  part: '/orders/create-item',
  transaction: '/finance/new',
};

const CAPTURE_ROUTES: Record<
  Extract<HomeQuickActionCommand, { kind: 'capture' }>['surface'],
  string
> = {
  scan: '/(tabs)/scan',
  document: '/import',
};

export type HomeQuickActionRunner = {
  run: (action: HomeQuickAction) => void;
  /** The action currently working in place, so its control can say so. */
  busyId: HomeQuickActionId | null;
};

/**
 * What the reader is told after asking for the stuck photos again.
 *
 * The copy speaks about photos, never about a queue: "Retrying sync…" described
 * machinery a person standing in a yard has no model of and no way to influence.
 * Same wording as the Engines banner, because it is the same event.
 */
function reportRetry(result: { discarded: number; retried: number }, stillPending: number): void {
  const { discarded, retried } = result;

  if (discarded > 0 && retried === 0) {
    toast({
      title:
        discarded === 1
          ? '1 photo is no longer on this phone'
          : `${discarded} photos are no longer on this phone`,
      description: 'Shoot those angles again.',
      variant: 'warning',
    });
    return;
  }

  if (retried > 0 && discarded > 0) {
    toast({
      title: 'Trying those photos again',
      description:
        discarded === 1
          ? '1 photo is no longer on this phone — shoot it again.'
          : `${discarded} photos are no longer on this phone — shoot them again.`,
      variant: 'warning',
    });
    return;
  }

  if (retried > 0) {
    toast({ title: 'Trying those photos again', variant: 'default' });
    return;
  }

  if (stillPending > 0) return;

  toast({ title: 'Every photo is on the server', variant: 'success' });
}

export function useHomeQuickActionRunner(): HomeQuickActionRunner {
  const router = useRouter();
  const navigateTab = useNavigateTab();
  const { companyId } = useSession();
  const [busyId, setBusyId] = useState<HomeQuickActionId | null>(null);

  const retryPhotos = useCallback(
    (id: HomeQuickActionId) => {
      if (!companyId) return;
      setBusyId(id);
      void (async () => {
        try {
          const result = await resolveFailedIntakeOutbox(companyId);
          const pending = getCompanyIntakeOutboxSnapshot(companyId).pendingCount;
          if (result.retried === 0 && result.discarded === 0 && pending > 0) {
            void drainIntakeOutbox(companyId);
          }
          reportRetry(result, pending);
        } finally {
          setBusyId(null);
        }
      })();
    },
    [companyId],
  );

  const run = useCallback(
    (action: HomeQuickAction) => {
      // Only the working command is deaf. The retry lives on a session-wide
      // store and keeps running, so leaving Home while it finishes is fine.
      if (busyId === action.id) return;
      const command = action.command;

      switch (command.kind) {
        case 'resume-intake':
          haptics.medium();
          openEngineIntakeSession(router, command.jobId, command.sessionId);
          return;
        case 'retry-intake-photos':
          haptics.medium();
          retryPhotos(action.id);
          return;
        case 'capture':
          navigateTab(CAPTURE_ROUTES[command.surface]);
          return;
        case 'compose':
          navigateTab(COMPOSER_ROUTES[command.entity]);
          return;
      }
    },
    [busyId, navigateTab, retryPhotos, router],
  );

  return { run, busyId };
}
