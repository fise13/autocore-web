import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import {
  drainIntakeOutbox,
  dropIdempotentPhotoConflicts,
  getIntakeOutboxSnapshot,
  purgeUnrecoverableIntakeOutbox,
  requeueTransientTransportFailures,
  subscribeIntakeOutbox,
} from '@/features/engine-intake/store/intake-outbox';
import { subscribeIntakeUploadProgress } from '@/features/engine-intake/store/intake-upload-progress';
import { nextWakeUpAt } from '@/features/engine-intake/lib/sync-schedule';
import { reconcileIntakeAttentionNotification } from '@/features/engine-intake/lib/intake-sync-notifications';
import { shouldRunLeaveAppDrain } from '@/features/engine-intake/lib/leave-app-drain';
import {
  pushOperationsLiveActivity,
  resetOperationsLiveActivityPush,
  setIntakeLiveActivityScope,
} from '@/features/live-activity/push-operations-live-activity';
import { useSession } from '@/hooks/use-session';
import {
  beginBackgroundExecution,
  endBackgroundExecution,
} from '@/lib/offline/background-execution';
import { syncBackgroundTaskRegistration } from '@/lib/offline/background-sync-task';

/** Ignore NetInfo flapping before committing to a drain. */
const NETWORK_DEBOUNCE_MS = 200;
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
 * navigation tree. The Dynamic Island is driven from here too: the tab host
 * unmounts on the camera route, which is exactly when photos start leaving.
 */
export function IntakeSyncHead() {
  const { companyId } = useSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!companyId) {
      setIntakeLiveActivityScope(null);
      resetOperationsLiveActivityPush();
      return;
    }

    let disposed = false;
    setIntakeLiveActivityScope(companyId);

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const run = () => {
      if (disposed) return;
      return drainIntakeOutbox(companyId).finally(() => {
        void syncBackgroundTaskRegistration();
        pushOperationsLiveActivity();
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
    reconcileIntakeAttentionNotification(0);
    run();
    armRetryTimer();
    void syncBackgroundTaskRegistration();
    pushOperationsLiveActivity();

    const unsubscribeOutbox = subscribeIntakeOutbox(() => {
      armRetryTimer();
      void syncBackgroundTaskRegistration();
      pushOperationsLiveActivity();
      // Leave-app: a torn-down prepare requeues the row after the first drain
      // pass already returned "empty". Without this, those photos sat until
      // the retry timer or a 15-minute background task.
      if (String(AppState.currentState) !== 'active') {
        run();
      }
    });

    const unsubscribeProgress = subscribeIntakeUploadProgress(() => {
      pushOperationsLiveActivity();
    });

    const unsubscribeNetwork = NetInfo.addEventListener(() => {
      // Nudge on any NetInfo event — "offline" readings are unreliable on iOS
      // and must not suppress drain (claim reclaim + photo PUT).
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        run();
        armRetryTimer();
      }, NETWORK_DEBOUNCE_MS);
    });

    const leave = () => {
      // Must not await — a Promise hop here is how an instant Home swipe
      // froze JS before `beginBackgroundTask` existed. Native also begins
      // on `willResignActive`.
      beginBackgroundExecution('intake-sync');
      requeueTransientTransportFailures();
      pushOperationsLiveActivity({ force: true });
      void (async () => {
        try {
          void syncBackgroundTaskRegistration();
          await run();
        } catch {
          // Expiration / drain errors still leave the native assertion up
          // until iOS takes it back. That is the point of this window.
        }
      })();
    };

    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void endBackgroundExecution();
        dropIdempotentPhotoConflicts(companyId);
        purgeUnrecoverableIntakeOutbox(companyId);
        requeueTransientTransportFailures();
        void run();
        armRetryTimer();
        pushOperationsLiveActivity({ force: true });
        return;
      }
      // Native `willResignActive` already holds JS. Do not drain on `inactive`:
      // Live Activity / Control Center bounce back to `active` and used to skip
      // finalize, so photos sat until the app was opened again.
      if (shouldRunLeaveAppDrain(next)) {
        leave();
      } else if (next === 'inactive') {
        beginBackgroundExecution('intake-sync');
        pushOperationsLiveActivity({ force: true });
      }
    });

    return () => {
      disposed = true;
      clearTimer();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribeOutbox();
      unsubscribeProgress();
      unsubscribeNetwork();
      appState.remove();
      resetOperationsLiveActivityPush();
    };
  }, [companyId]);

  return null;
}
