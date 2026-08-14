import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { resolveSyncSummary } from '@/features/engine-intake/lib/sync-status';
import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useWorkCounts } from '@/features/work/hooks/use-work-counts';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';

import { syncCountsFromJobs } from './lib/live-activity-model';
import {
  EMPTY_INTAKE_BAY_COUNTS,
  EMPTY_TODAY_COUNTS,
  EMPTY_WAREHOUSE_WIDGET_COUNTS,
  EMPTY_WORK_WIDGET_COUNTS,
  UNKNOWN_COUNT,
  buildIntakeBayWidgetProps,
  buildSyncWidgetProps,
  buildTodayWidgetProps,
  buildWarehouseWidgetProps,
  buildWorkWidgetProps,
  countIntakeAwaitingFromJobs,
  countIntakeBayFromJobs,
  widgetSnapshotKey,
  type IntakeBayWidgetCounts,
  type TodayWidgetCounts,
  type WarehouseWidgetCounts,
  type WorkWidgetCounts,
} from './lib/widget-model';
import { useIsOnline } from './use-is-online';
import { AutoCoreIntakeWidget } from './widgets/intake-bay-widget';
import { AutoCoreSyncWidget } from './widgets/sync-widget';
import { AutoCoreTodayWidget } from './widgets/today-widget';
import { AutoCoreWarehouseWidget } from './widgets/warehouse-widget';
import { AutoCoreWorkWidget } from './widgets/work-orders-widget';

/**
 * Rows the shop widgets read. `locations` is skipped — a widget is not worth
 * a locations fetch the user did not ask for. Intake Bay already subscribes
 * to jobs; Today derives awaiting from that list instead of opening a second
 * `useWorkCounts` intake query.
 */
const WIDGET_NODE_IDS: ReadonlySet<string> = new Set([
  'orders',
  'engines',
  'parts',
  'receiving',
]);

const WIDGET_NODE_IDS_WITH_EARNINGS: ReadonlySet<string> = new Set([
  ...WIDGET_NODE_IDS,
  'earnings',
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
  const rbac = useRbacPolicy();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);
  const intake = useEngineIntakeJobs(intakeEnabled ? companyId : null);
  const nodeIds = rbac.nav.canAccessMyEarnings
    ? WIDGET_NODE_IDS_WITH_EARNINGS
    : WIDGET_NODE_IDS;
  const { counts } = useWorkCounts(nodeIds);

  const syncKeyRef = useRef<string>('');
  const todayKeyRef = useRef<string>('');
  const intakeKeyRef = useRef<string>('');
  const workKeyRef = useRef<string>('');
  const warehouseKeyRef = useRef<string>('');

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
    const resolved: TodayWidgetCounts = companyId
      ? {
          openOrders: counts.orders ? counts.orders.open : UNKNOWN_COUNT,
          attentionOrders: counts.orders ? counts.orders.attention : UNKNOWN_COUNT,
          engines: counts.engines ? counts.engines.total : UNKNOWN_COUNT,
          awaitingPlacement: counts.receiving
            ? counts.receiving.awaitingPlacement
            : UNKNOWN_COUNT,
          lowStock: counts.parts ? counts.parts.lowStock : UNKNOWN_COUNT,
          earningsPending: counts.earnings ? counts.earnings.pendingCount : UNKNOWN_COUNT,
          earningsClaimable: counts.earnings ? counts.earnings.claimable : UNKNOWN_COUNT,
          intakeAwaiting:
            intakeEnabled && !intake.loading
              ? countIntakeAwaitingFromJobs(intake.jobs)
              : UNKNOWN_COUNT,
        }
      : EMPTY_TODAY_COUNTS;
    return buildTodayWidgetProps(resolved, 0);
  }, [
    companyId,
    counts.earnings,
    counts.engines,
    counts.orders,
    counts.parts,
    counts.receiving,
    intake.jobs,
    intake.loading,
    intakeEnabled,
  ]);

  const workProps = useMemo(() => {
    const resolved: WorkWidgetCounts = companyId
      ? {
          openOrders: counts.orders ? counts.orders.open : UNKNOWN_COUNT,
          attentionOrders: counts.orders ? counts.orders.attention : UNKNOWN_COUNT,
        }
      : EMPTY_WORK_WIDGET_COUNTS;
    return buildWorkWidgetProps(resolved, 0);
  }, [companyId, counts.orders]);

  const warehouseProps = useMemo(() => {
    const resolved: WarehouseWidgetCounts = companyId
      ? {
          awaitingPlacement: counts.receiving
            ? counts.receiving.awaitingPlacement
            : UNKNOWN_COUNT,
          lowStock: counts.parts ? counts.parts.lowStock : UNKNOWN_COUNT,
          engines: counts.engines ? counts.engines.total : UNKNOWN_COUNT,
        }
      : EMPTY_WAREHOUSE_WIDGET_COUNTS;
    return buildWarehouseWidgetProps(resolved, 0);
  }, [companyId, counts.engines, counts.parts, counts.receiving]);

  const intakeProps = useMemo(() => {
    if (!intakeEnabled || !companyId) {
      return buildIntakeBayWidgetProps(EMPTY_INTAKE_BAY_COUNTS, 0);
    }
    const bay = intake.loading
      ? EMPTY_INTAKE_BAY_COUNTS
      : countIntakeBayFromJobs(intake.jobs);
    const resolved: IntakeBayWidgetCounts = {
      active: bay.active,
      ready: bay.ready,
      syncing: outbox.photoPendingCount,
    };
    return buildIntakeBayWidgetProps(resolved, 0);
  }, [
    companyId,
    intake.jobs,
    intake.loading,
    intakeEnabled,
    outbox.photoPendingCount,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(syncProps);
    if (key === syncKeyRef.current) return;
    syncKeyRef.current = key;
    try {
      AutoCoreSyncWidget.updateSnapshot({ ...syncProps, updatedAtMs: Date.now() });
    } catch {
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

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(workProps);
    if (key === workKeyRef.current) return;
    workKeyRef.current = key;
    try {
      AutoCoreWorkWidget.updateSnapshot({ ...workProps, updatedAtMs: Date.now() });
    } catch {
      workKeyRef.current = '';
    }
  }, [workProps]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(warehouseProps);
    if (key === warehouseKeyRef.current) return;
    warehouseKeyRef.current = key;
    try {
      AutoCoreWarehouseWidget.updateSnapshot({ ...warehouseProps, updatedAtMs: Date.now() });
    } catch {
      warehouseKeyRef.current = '';
    }
  }, [warehouseProps]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(intakeProps);
    if (key === intakeKeyRef.current) return;
    intakeKeyRef.current = key;
    try {
      AutoCoreIntakeWidget.updateSnapshot({ ...intakeProps, updatedAtMs: Date.now() });
    } catch {
      intakeKeyRef.current = '';
    }
  }, [intakeProps]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      try {
        const now = Date.now();
        AutoCoreSyncWidget.updateSnapshot({ ...syncProps, updatedAtMs: now });
        AutoCoreTodayWidget.updateSnapshot({ ...todayProps, updatedAtMs: now });
        AutoCoreWorkWidget.updateSnapshot({ ...workProps, updatedAtMs: now });
        AutoCoreWarehouseWidget.updateSnapshot({ ...warehouseProps, updatedAtMs: now });
        AutoCoreIntakeWidget.updateSnapshot({ ...intakeProps, updatedAtMs: now });
      } catch {
        // Ignore — the next foreground pass writes again.
      }
    });
    return () => subscription.remove();
  }, [intakeProps, syncProps, todayProps, warehouseProps, workProps]);
}
