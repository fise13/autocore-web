import { AppState } from 'react-native';

import {
  cancelLocalNotification,
  scheduleLocalNotification,
} from '@/services/notifications/push-channel';

const LOCAL_ID = 'intake-photos-need-you';
const INTAKE_URL = 'autocoremobile://intake';

let lastNotifiedCount = -1;

/**
 * An OS notification for engine photos that are stuck behind a person.
 *
 * Deliberately narrow. The previous version counted every failed row, which on
 * a yard connection meant a "Sync failed — 4 intake items need attention"
 * banner arrived every time somebody walked behind a container, about photos
 * that were perfectly safe and that the queue delivered on its own minutes
 * later. Being wrong that often is worse than being silent: people learn to
 * dismiss the banner, and then the one that means "sign in again" goes with it.
 *
 * Only fires while the app is in the background — in the foreground the screen
 * already says it — and clears itself the moment nothing needs a person.
 */
export function reconcileIntakeAttentionNotification(needsPersonCount: number): void {
  const count = Math.max(0, needsPersonCount);

  if (count === 0) {
    lastNotifiedCount = 0;
    void cancelLocalNotification(LOCAL_ID);
    return;
  }

  if (AppState.currentState === 'active') {
    return;
  }

  if (count === lastNotifiedCount) return;
  lastNotifiedCount = count;

  void scheduleLocalNotification({
    id: LOCAL_ID,
    title: 'Engine photos need you',
    body:
      count === 1
        ? '1 photo cannot go up until you look at it'
        : `${count} photos cannot go up until you look at them`,
    data: { deepLink: INTAKE_URL, type: 'intake.needs_attention' },
  });
}

/** Reset dedupe state (tests / sign-out). */
export function resetIntakeSyncLocalNotificationState(): void {
  lastNotifiedCount = -1;
}
