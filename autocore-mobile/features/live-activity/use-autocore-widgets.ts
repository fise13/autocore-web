import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { resolveSyncSummary } from '@/features/engine-intake/lib/sync-status';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useWorkCounts } from '@/features/work/hooks/use-work-counts';
import { useSession } from '@/hooks/use-session';

import { syncCountsFromJobs } from './lib/live-activity-model';
import {
  EMPTY_TODAY_COUNTS,
  UNKNOWN_COUNT,
  buildSyncWidgetProps,
  buildTodayWidgetProps,
  widgetSnapshotKey,
  type TodayWidgetCounts,
} from './lib/widget-model';
import { useIsOnline } from './use-is-online';
import { AutoCoreSyncWidget } from './widgets/sync-widget';
import { AutoCoreTodayWidget } from './widgets/today-widget';

/**
 * Rows the Today widget reads. Deliberately excludes `locations` and `intake`:
 * both would make `useWorkCounts` open network queries, and a widget is not
 * worth a fetch the user did not ask for.
 */
const WIDGET_NODE_IDS: ReadonlySet<string> = new Set([
  'orders',
  'engines',
  'parts',
  'receiving',
]);

/**
 * Keeps the Home Screen and Lock Screen widgets fed.
 *
 * WidgetKit does not pull — the app pushes a snapshot and the system decides
 * when to draw it. So this hook writes on every meaningful change and again on
 * background, which is the last moment we are guaranteed to run before the
 * person is looking at their Lock Screen.
 *
 * Snapshots are keyed on content, not time: WidgetKit gives an app a limited
 * number of reloads per day, and spending them on identical data means the one
 * that mattered gets dropped.
 */
export function useAutoCoreWidgets() {
  const online = useIsOnline();
  const { companyId, can } = useSession();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);
  const counts = useWorkCounts(WIDGET_NODE_IDS);

  const syncKeyRef = useRef<string>('');
  const todayKeyRef = useRef<string>('');

  // `updatedAtMs` is stamped at push time, not here: reading the clock during
  // render makes the memo unstable, and the value only means anything at the
  // moment the snapshot actually reaches WidgetKit.
  const syncProps = useMemo(() => {
    const summary = resolveSyncSummary(
      syncCountsFromJobs({
        enabled: intakeEnabled,
        online,
        photos: intakeEnabled ? outbox.photos : [],
        completedInWave: outbox.syncedCount,
        waveTotal: outbox.sessionTotal,
      }),
    );
    return buildSyncWidgetProps(summary, 0);
  }, [intakeEnabled, online, outbox.photos, outbox.sessionTotal, outbox.syncedCount]);

  const todayProps = useMemo(() => {
    // Signed out, or a company we can no longer read: publish blanks rather
    // than leaving another company's numbers sitting on the Lock Screen.
    const resolved: TodayWidgetCounts = companyId
      ? {
          openOrders: counts.orders ? counts.orders.open : UNKNOWN_COUNT,
          attentionOrders: counts.orders ? counts.orders.attention : UNKNOWN_COUNT,
          engines: counts.engines ? counts.engines.total : UNKNOWN_COUNT,
          awaitingPlacement: counts.receiving
            ? counts.receiving.awaitingPlacement
            : UNKNOWN_COUNT,
          lowStock: counts.parts ? counts.parts.lowStock : UNKNOWN_COUNT,
        }
      : EMPTY_TODAY_COUNTS;
    return buildTodayWidgetProps(resolved, 0);
  }, [companyId, counts.engines, counts.orders, counts.parts, counts.receiving]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(syncProps);
    if (key === syncKeyRef.current) return;
    syncKeyRef.current = key;
    try {
      AutoCoreSyncWidget.updateSnapshot({ ...syncProps, updatedAtMs: Date.now() });
    } catch {
      // A widget that will not accept a snapshot must never take the app with it.
      syncKeyRef.current = '';
    }
  }, [syncProps]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(todayProps);
    if (key === todayKeyRef.current) return;
    todayKeyRef.current = key;
    try {
      AutoCoreTodayWidget.updateSnapshot({ ...todayProps, updatedAtMs: Date.now() });
    } catch {
      todayKeyRef.current = '';
    }
  }, [todayProps]);

  // Backgrounding is the handover point: from here the widget is the only
  // AutoCore surface the person can see, so give it the freshest timestamp.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      try {
        AutoCoreSyncWidget.updateSnapshot({ ...syncProps, updatedAtMs: Date.now() });
        AutoCoreTodayWidget.updateSnapshot({ ...todayProps, updatedAtMs: Date.now() });
      } catch {
        // Ignore — the next foreground pass writes again.
      }
    });
    return () => subscription.remove();
  }, [syncProps, todayProps]);
}
