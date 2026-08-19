import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useWorkCounts } from '@/features/work/hooks/use-work-counts';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';

import {
  EMPTY_INTAKE_BAY_COUNTS,
  EMPTY_PAY_COUNTS,
  EMPTY_TODAY_COUNTS,
  UNKNOWN_COUNT,
  buildIntakeBayWidgetProps,
  buildPayWidgetProps,
  buildScanWidgetProps,
  buildTodayWidgetProps,
  countIntakeAwaitingFromJobs,
  countIntakeBayFromJobs,
  widgetSnapshotKey,
  type IntakeBayWidgetCounts,
  type PayAccess,
  type TodayWidgetCounts,
} from './lib/widget-model';
import { AutoCoreIntakeWidget } from './widgets/intake-bay-widget';
import { AutoCorePayWidget } from './widgets/pay-widget';
import { AutoCoreScanWidget } from './widgets/scan-widget';
import { AutoCoreTodayWidget } from './widgets/today-widget';

/**
 * Rows the shop widgets read. `locations` is skipped — a widget is not worth
 * a locations fetch the user did not ask for. Intake Bay already subscribes
 * to jobs; Floor derives awaiting from that list instead of opening a second
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
  const { companyId, can } = useSession();
  const rbac = useRbacPolicy();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);
  const intake = useEngineIntakeJobs(intakeEnabled ? companyId : null);
  const payAccess: PayAccess = !companyId
    ? 'unknown'
    : rbac.nav.canAccessMyEarnings
      ? 'allowed'
      : 'denied';
  const nodeIds = payAccess === 'allowed' ? WIDGET_NODE_IDS_WITH_EARNINGS : WIDGET_NODE_IDS;
  const { counts } = useWorkCounts(nodeIds);

  const todayKeyRef = useRef<string>('');
  const intakeKeyRef = useRef<string>('');
  const scanKeyRef = useRef<string>('');
  const payKeyRef = useRef<string>('');

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

  const scanProps = useMemo(() => {
    const awaiting = companyId
      ? counts.receiving
        ? counts.receiving.awaitingPlacement
        : UNKNOWN_COUNT
      : UNKNOWN_COUNT;
    return buildScanWidgetProps(awaiting, 0);
  }, [companyId, counts.receiving]);

  const payProps = useMemo(() => {
    if (payAccess !== 'allowed') {
      return buildPayWidgetProps(EMPTY_PAY_COUNTS, payAccess, 0);
    }
    const resolved = counts.earnings
      ? { pending: counts.earnings.pendingCount, claimable: counts.earnings.claimable }
      : EMPTY_PAY_COUNTS;
    return buildPayWidgetProps(resolved, 'allowed', 0);
  }, [counts.earnings, payAccess]);

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
    const key = widgetSnapshotKey(scanProps);
    if (key === scanKeyRef.current) return;
    scanKeyRef.current = key;
    try {
      AutoCoreScanWidget.updateSnapshot({ ...scanProps, updatedAtMs: Date.now() });
    } catch {
      scanKeyRef.current = '';
    }
  }, [scanProps]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const key = widgetSnapshotKey(payProps);
    if (key === payKeyRef.current) return;
    payKeyRef.current = key;
    try {
      AutoCorePayWidget.updateSnapshot({ ...payProps, updatedAtMs: Date.now() });
    } catch {
      payKeyRef.current = '';
    }
  }, [payProps]);

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
        AutoCoreTodayWidget.updateSnapshot({ ...todayProps, updatedAtMs: now });
        AutoCoreScanWidget.updateSnapshot({ ...scanProps, updatedAtMs: now });
        AutoCorePayWidget.updateSnapshot({ ...payProps, updatedAtMs: now });
        AutoCoreIntakeWidget.updateSnapshot({ ...intakeProps, updatedAtMs: now });
      } catch {
        // Ignore — the next foreground pass writes again.
      }
    });
    return () => subscription.remove();
  }, [intakeProps, payProps, scanProps, todayProps]);
}
