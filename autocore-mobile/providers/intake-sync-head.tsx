import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import {
  drainIntakeOutbox,
  dropIdempotentPhotoConflicts,
  getIntakeOutboxSnapshot,
  purgeUnrecoverableIntakeOutbox,
  subscribeIntakeOutbox,
} from '@/features/engine-intake/store/intake-outbox';
import { nextWakeUpAt } from '@/features/engine-intake/lib/sync-schedule';
import { reconcileIntakeSyncLocalNotification } from '@/features/engine-intake/lib/intake-sync-notifications';
import { useSession } from '@/hooks/use-session';
import { syncBackgroundTaskRegistration } from '@/lib/offline/background-sync-task';

/** Ignore NetInfo flapping before committing to a drain. */
const NETWORK_DEBOUNCE_MS = 600;
/** Ceiling on a single armed timer — `setTimeout` is unreliable beyond minutes. */
const MAX_TIMER_MS = 60_000;

/**
 * Headless owner of intake sync.
 *
 * Before this, the NetInfo listener, the AppState listener and the initial
 * drain all lived inside `useEngineIntakeOutbox`'s effect — so sync only
 * resumed while a component calling that hook happened to be mounted. Leaving
 * the intake screens took the network listener with them, and there was no
 * retry timer at all: a transient 500 sat untouched until something else
 * happened to call `drain` again.
 *
 * Mounting this next to `SessionRealtimeHead` gives the queue one owner for the
 * life of the session. It renders nothing, so outbox churn never re-renders the
 * navigation tree.
 */
export function IntakeSyncHead() {
  const { companyId } = useSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!companyId) return;

    let disposed = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const run = () => {
      if (disposed) return;
      void drainIntakeOutbox(companyId).finally(() => {
        void syncBackgroundTaskRegistration();
      });
    };

    /**
     * One timer for the whole queue, armed at the soonest `nextRetryAt`. The
     * schedule itself is persisted, so a timer lost to a process restart only
     * costs latency — the launch drain picks the work back up.
     */
    const armRetryTimer = () => {
      clearTimer();
      if (disposed) return;
      const snapshot = getIntakeOutboxSnapshot();
      const jobs = [
        ...snapshot.commands.filter((item) => item.companyId === companyId),
        ...snapshot.photos.filter((item) => item.companyId === companyId),
      ];
      const wake = nextWakeUpAt(jobs);
      if (!wake) return;
      const delay = Math.min(Math.max(wake.getTime() - Date.now(), 0), MAX_TIMER_MS);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        run();
        armRetryTimer();
      }, delay);
    };

    // Launch: reconcile stale rows (done at module load), drop rows whose file
    // is gone, clear leftover 409s, then drain.
    dropIdempotentPhotoConflicts(companyId);
    purgeUnrecoverableIntakeOutbox(companyId);
    reconcileIntakeSyncLocalNotification(0);
    run();
    armRetryTimer();
    void syncBackgroundTaskRegistration();

    const unsubscribeOutbox = subscribeIntakeOutbox(() => {
      armRetryTimer();
      void syncBackgroundTaskRegistration();
    });

    const unsubscribeNetwork = NetInfo.addEventListener((network) => {
      if (!network.isConnected) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        run();
        armRetryTimer();
      }, NETWORK_DEBOUNCE_MS);
    });

    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        dropIdempotentPhotoConflicts(companyId);
        purgeUnrecoverableIntakeOutbox(companyId);
        run();
        armRetryTimer();
        return;
      }
      // Leaving the app: start the drain so iOS can hand the PUT to a
      // background URLSession, then arm BGProcessingTask for after kill/reboot.
      if (next === 'background' || next === 'inactive') {
        void syncBackgroundTaskRegistration();
        run();
      }
    });

    return () => {
      disposed = true;
      clearTimer();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribeOutbox();
      unsubscribeNetwork();
      appState.remove();
    };
  }, [companyId]);

  return null;
}
