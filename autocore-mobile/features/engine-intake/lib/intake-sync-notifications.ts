import { AppState } from 'react-native';

import {
  cancelLocalNotification,
  scheduleLocalNotification,
} from '@/services/notifications/push-channel';

const LOCAL_ID = 'intake-sync-failed';
const INTAKE_URL = 'autocoremobile://intake';

let lastNotifiedFailedCount = -1;

/**
 * Local OS notification for intake outbox failures while backgrounded.
 * Foreground UX is Dynamic Island + in-app banner — no local spam there.
 * Cleared when the outbox is healthy again.
 */
export function reconcileIntakeSyncLocalNotification(failedCount: number): void {
  const failed = Math.max(0, failedCount);

  if (failed === 0) {
    lastNotifiedFailedCount = 0;
    void cancelLocalNotification(LOCAL_ID);
    return;
  }

  if (AppState.currentState === 'active') {
    return;
  }

  if (failed === lastNotifiedFailedCount) return;
  lastNotifiedFailedCount = failed;

  void scheduleLocalNotification({
    id: LOCAL_ID,
    title: 'Sync failed',
    body:
      failed === 1
        ? '1 intake item needs attention'
        : `${failed} intake items need attention`,
    data: { deepLink: INTAKE_URL, type: 'sync.failed' },
  });
}

/** Reset dedupe state (tests / sign-out). */
export function resetIntakeSyncLocalNotificationState(): void {
  lastNotifiedFailedCount = -1;
}
