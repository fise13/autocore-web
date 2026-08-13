import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { reconcileIntakeSyncLocalNotification } from '@/features/engine-intake/lib/intake-sync-notifications';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useSession } from '@/hooks/use-session';

import { ensureLiveActivityAppIconUri } from './ensure-live-activity-icon';
import { OperationsLiveActivity } from './operations-live-activity';
import {
  liveActivityContentKey,
  resolveDesiredLiveActivity,
  type DesiredLiveActivity,
} from './resolve-desired-live-activity';

const INTAKE_URL = 'autocoremobile://intake';
/** Ignore brief NetInfo blips before starting a new island. */
const START_DEBOUNCE_MS = 350;
/**
 * Presentation gate for ActivityKit. Enabled for intake outbox sync states.
 * Layout lives in the widget extension — ship a device Release rebuild
 * (`npm run ios:release`) after changing `operations-live-activity.tsx`.
 */
const LIVE_ACTIVITY_PRESENTATION_ENABLED = true;

let cachedIconUri = '';

async function endAllInstances(): Promise<void> {
  const active = OperationsLiveActivity.getInstances();
  await Promise.all(active.map((instance) => instance.end('immediate').catch(() => undefined)));
}

async function applyDesired(desired: DesiredLiveActivity): Promise<void> {
  if (desired.kind === 'idle' || !LIVE_ACTIVITY_PRESENTATION_ENABLED) {
    await endAllInstances();
    return;
  }

  if (!cachedIconUri) {
    cachedIconUri = (await ensureLiveActivityAppIconUri()) ?? '';
  }

  const props = {
    mode: desired.mode,
    title: desired.title,
    detail: desired.detail,
    count: desired.count,
    done: desired.done,
    total: desired.total,
    progress: desired.progress,
    progressLabel: desired.progressLabel,
    iconUri: cachedIconUri,
  };

  const instances = OperationsLiveActivity.getInstances();
  if (instances.length > 0) {
    const [primary, ...extras] = instances;
    // Never leave parallel Islands — extras become duplicate intake opens on tap.
    await Promise.all(extras.map((instance) => instance.end('immediate').catch(() => undefined)));
    try {
      await primary.update(props);
      return;
    } catch {
      await primary.end('immediate').catch(() => undefined);
    }
  }

  // Ensure a clean single instance before start (update path may have cleared it).
  await endAllInstances();
  OperationsLiveActivity.start(props, INTAKE_URL);
}

/**
 * Drives the iOS Dynamic Island / Lock Screen Live Activity from intake outbox
 * state. Shows ONLY when there is actionable information (pending / failed).
 * Bare offline with an empty outbox stays idle.
 *
 * On mount we always clear ActivityKit leftovers — stale blank black pills from
 * prior builds otherwise stick on the Lock Screen / Island.
 *
 * No-op on Android / web. Layout changes require a native rebuild (`expo-widgets`).
 */
export function useOperationsLiveActivity() {
  const [offline, setOffline] = useState(false);
  const [clearedStale, setClearedStale] = useState(false);
  const { companyId, can } = useSession();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);
  const lastKeyRef = useRef<string>('');
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desiredRef = useRef<DesiredLiveActivity>({ kind: 'idle' });

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setClearedStale(true);
      return;
    }

    let cancelled = false;
    void endAllInstances()
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        lastKeyRef.current = '';
        setClearedStale(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const applyNet = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null | undefined;
    }) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    };

    void NetInfo.fetch().then(applyNet);
    const sub = NetInfo.addEventListener(applyNet);
    return () => sub();
  }, []);

  const desired = useMemo(
    () =>
      resolveDesiredLiveActivity({
        enabled: Platform.OS === 'ios' && intakeEnabled,
        offline,
        // Photo-only — banner may still show command noise via pendingCount.
        pendingCount: outbox.photoPendingCount,
        failedCount: outbox.photoFailedCount,
        syncing: outbox.syncing,
        syncedCount: outbox.syncedCount,
        sessionTotal: outbox.sessionTotal,
      }),
    [
      intakeEnabled,
      offline,
      outbox.photoFailedCount,
      outbox.photoPendingCount,
      outbox.sessionTotal,
      outbox.syncedCount,
      outbox.syncing,
    ],
  );

  desiredRef.current = desired;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!clearedStale) return;

    let cancelled = false;
    const key = liveActivityContentKey(desired);

    const clearStartTimer = () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    };

    const commit = async (next: DesiredLiveActivity, nextKey: string) => {
      if (cancelled) return;
      try {
        await applyDesired(next);
        lastKeyRef.current = nextKey;
      } catch {
        lastKeyRef.current = '';
      }
    };

    if (key === lastKeyRef.current) return;

    // End immediately — never leave a stale island when outbox clears.
    if (desired.kind === 'idle') {
      clearStartTimer();
      void commit(desired, key);
      return;
    }

    const alreadyActive = OperationsLiveActivity.getInstances().length > 0;
    if (alreadyActive) {
      clearStartTimer();
      void commit(desired, key);
      return;
    }

    // Debounce cold start only.
    clearStartTimer();
    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      void commit(desired, key);
    }, START_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearStartTimer();
    };
  }, [clearedStale, desired]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (intakeEnabled) return;
    lastKeyRef.current = 'idle';
    void endAllInstances();
  }, [intakeEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        if (intakeEnabled) {
          reconcileIntakeSyncLocalNotification(outbox.failedCount);
        }
        return;
      }

      if (Platform.OS !== 'ios') return;
      if (!clearedStale) return;
      const current = desiredRef.current;
      const key = liveActivityContentKey(current);
      if (current.kind === 'idle') {
        lastKeyRef.current = 'idle';
        void endAllInstances();
        return;
      }
      // Re-assert after foreground — system may have dismissed the island.
      lastKeyRef.current = '';
      void applyDesired(current).then(() => {
        lastKeyRef.current = key;
      });
    });
    return () => sub.remove();
  }, [clearedStale, intakeEnabled, outbox.failedCount]);

  // Local OS notification for failed intake sync while backgrounded; clear when healthy.
  useEffect(() => {
    if (!intakeEnabled) {
      reconcileIntakeSyncLocalNotification(0);
      return;
    }
    reconcileIntakeSyncLocalNotification(outbox.failedCount);
  }, [intakeEnabled, outbox.failedCount]);
}
