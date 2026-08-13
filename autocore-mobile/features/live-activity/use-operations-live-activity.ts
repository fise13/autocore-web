import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { after } from 'expo-widgets';

import { reconcileIntakeSyncLocalNotification } from '@/features/engine-intake/lib/intake-sync-notifications';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useSession } from '@/hooks/use-session';

import { ensureLiveActivityAppIconUri } from './ensure-live-activity-icon';
import {
  buildCompletionProps,
  liveActivityContentKey,
  resolveDesiredLiveActivity,
  type DesiredLiveActivity,
  type LiveActivityProps,
} from './lib/live-activity-model';
import { OperationsLiveActivity } from './operations-live-activity';
import { useIsOnline } from './use-is-online';

const INTAKE_URL = 'autocoremobile://intake';
/** Ignore brief NetInfo blips before starting a new island. */
const START_DEBOUNCE_MS = 350;
/** How long "N photos synced" stays up before the system removes it. */
const COMPLETION_LINGER_MS = 6_000;
/**
 * Presentation gate for ActivityKit. Layout lives in the widget extension —
 * ship a device Release rebuild (`npm run ios:release`) after changing
 * `operations-live-activity.tsx`.
 */
const LIVE_ACTIVITY_PRESENTATION_ENABLED = true;

let cachedIconUri = '';

async function endAllInstances(): Promise<void> {
  const active = OperationsLiveActivity.getInstances();
  await Promise.all(active.map((instance) => instance.end('immediate').catch(() => undefined)));
}

/**
 * Ends on a success frame instead of vanishing.
 *
 * A Live Activity that disappears the instant the last upload lands reads as a
 * crash — the person never sees the queue reach the end. Apple's own pattern is
 * to render the finished state briefly and let the system dismiss it.
 */
async function endWithCompletion(props: LiveActivityProps): Promise<void> {
  const instances = OperationsLiveActivity.getInstances();
  if (instances.length === 0) return;
  const dismissAt = new Date(Date.now() + COMPLETION_LINGER_MS);
  await Promise.all(
    instances.map((instance) =>
      instance
        .end(after(dismissAt), props)
        // `after` needs the activity to still be alive; fall back to a hard end.
        .catch(() => instance.end('immediate').catch(() => undefined)),
    ),
  );
}

async function applyDesired(desired: DesiredLiveActivity): Promise<void> {
  if (desired.kind === 'idle' || !LIVE_ACTIVITY_PRESENTATION_ENABLED) {
    await endAllInstances();
    return;
  }

  if (!cachedIconUri) {
    cachedIconUri = (await ensureLiveActivityAppIconUri()) ?? '';
  }

  const props: LiveActivityProps = { ...desired.props, iconUri: cachedIconUri };

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
 * state.
 *
 * The Live Activity is a *view*: every word and colour it shows comes from the
 * same `resolveSyncSummary` the in-app banner reads, so the two can never tell
 * different stories about the same queue. This hook only decides *when* to
 * start, update and end — never what the state means.
 *
 * It does not own retries. `IntakeSyncHead` does, and it keeps running when
 * these screens unmount.
 *
 * On mount we always clear ActivityKit leftovers — stale blank pills from prior
 * builds otherwise stick on the Lock Screen.
 *
 * No-op on Android / web. Layout changes require a native rebuild.
 */
export function useOperationsLiveActivity() {
  const online = useIsOnline();
  // Nothing to clear off Android / web, so start already-cleared there rather
  // than bouncing through a synchronous setState inside the effect below.
  const [clearedStale, setClearedStale] = useState(() => Platform.OS !== 'ios');
  const { companyId, can } = useSession();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);
  const lastKeyRef = useRef<string>('');
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desiredRef = useRef<DesiredLiveActivity>({ kind: 'idle' });
  /**
   * High-water mark of photos confirmed in the wave being presented.
   *
   * The store resets `syncedCount` to zero the moment the queue empties, and
   * that reset can land in the same React commit as the last success — so
   * reading the live value at idle time would report zero. The peak can only
   * ever under-report by the final photo, never invent one, which is the right
   * way round: a discarded queue must not be announced as a successful sync.
   */
  const waveSyncedRef = useRef(0);
  const wavePresentedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

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

  const desired = useMemo(
    () =>
      resolveDesiredLiveActivity({
        enabled: Platform.OS === 'ios' && intakeEnabled,
        online,
        // Photo rows only — command heartbeats would inflate the denominator.
        photos: outbox.photos,
        completedInWave: outbox.syncedCount,
        waveTotal: outbox.sessionTotal,
      }),
    [intakeEnabled, online, outbox.photos, outbox.sessionTotal, outbox.syncedCount],
  );

  /**
   * Declared before the commit effect on purpose — effects run in order, so the
   * peak is always current by the time the commit effect decides how to end.
   */
  useEffect(() => {
    desiredRef.current = desired;
    if (desired.kind === 'active' && !wavePresentedRef.current) {
      // A new wave starts: forget the previous one rather than carrying it over.
      wavePresentedRef.current = true;
      waveSyncedRef.current = 0;
    }
    if (wavePresentedRef.current && outbox.syncedCount > waveSyncedRef.current) {
      waveSyncedRef.current = outbox.syncedCount;
    }
  }, [desired, outbox.syncedCount]);

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

    if (desired.kind === 'idle') {
      clearStartTimer();
      const synced = waveSyncedRef.current;
      waveSyncedRef.current = 0;
      wavePresentedRef.current = false;
      // Only celebrate a wave that actually moved. Going idle because the user
      // signed out, or discarded the queue, is not a success.
      if (synced > 0) {
        lastKeyRef.current = key;
        void endWithCompletion(buildCompletionProps(synced, { iconUri: cachedIconUri }));
        return;
      }
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
    waveSyncedRef.current = 0;
    wavePresentedRef.current = false;
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
