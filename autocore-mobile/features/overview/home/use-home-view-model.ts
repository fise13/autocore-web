/**
 * The single Home hook.
 *
 * There is deliberately one of these. An earlier Health-era dashboard hook lived
 * beside the shipped screen for months without being mounted, and the cost of
 * that is two Homes drifting apart. Sources → facts → metrics → ranking →
 * view model, once.
 */
import { useCallback, useEffect, useMemo } from 'react';

import { useActiveCompanyName } from '@/hooks/use-active-company-name';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useShellModel } from '@/lib/shell/use-shell-model';

import { buildHomeViewModel, type HomeTrendWindowInput } from './lib/build-home-view-model';
import { buildHomeMoney } from './lib/money';
import { HOME_SUMMARY_PERIOD, resolveHomeWindows } from './lib/period';
import { EMPTY_HOME_PREFERENCES } from './lib/ranking';
import { restoreHomeFromCache } from './lib/home-snapshot';
import { readHomeSnapshot, writeHomeSnapshot } from './lib/home-snapshot-store';
import { useHomeTrendPeriodStore } from './store/home-period-store';
import type { HomePeriodId, HomeViewModel } from './types';
import { useHomeSources } from './use-home-sources';

export type UseHomeViewModelResult = {
  model: HomeViewModel;
  /** The Trends range — the only period the reader controls on Home. */
  trendPeriod: HomePeriodId;
  setTrendPeriod: (period: HomePeriodId) => void;
};

export function useHomeViewModel(): UseHomeViewModelResult {
  const sources = useHomeSources();
  const rbac = useRbacPolicy();
  const shell = useShellModel();
  const { companyName } = useActiveCompanyName();

  const trendPeriod = useHomeTrendPeriodStore((state) => state.period);
  const setTrendPeriod = useHomeTrendPeriodStore((state) => state.setPeriod);

  const role = rbac.profile?.role ?? null;
  const canReadMoney =
    sources.permissions.canViewMoney && sources.modules.accounting && sources.ready.operations;

  const live = useMemo(() => {
    // `now` is captured inside the memo so the brief is recomputed when the data
    // moves, not on every render — and never re-sorted by the passing second.
    const now = new Date();
    const summary = resolveHomeWindows(HOME_SUMMARY_PERIOD, now);

    const money = canReadMoney
      ? buildHomeMoney(sources.operations, summary.current, summary.previous)
      : undefined;

    // Same range as the Summary means the assembler reuses one pool; only a
    // widened range costs a second pass over the ledger.
    const trendWindow: HomeTrendWindowInput | undefined =
      trendPeriod === HOME_SUMMARY_PERIOD
        ? undefined
        : (() => {
            const windows = resolveHomeWindows(trendPeriod, now);
            return {
              period: windows.period,
              previousPeriod: { start: windows.previous.from, end: windows.previous.to },
              money: canReadMoney
                ? buildHomeMoney(sources.operations, windows.current, windows.previous)
                : undefined,
            };
          })();

    return buildHomeViewModel({
      now,
      period: summary.period,
      previousPeriod: { start: summary.previous.from, end: summary.previous.to },
      role,
      uid: sources.uid,
      permissions: sources.permissions,
      modules: sources.modules,
      ready: sources.ready,
      orders: sources.orders,
      operations: sources.operations,
      motors: sources.motors,
      items: sources.items,
      payroll: sources.payroll,
      intakeJobs: sources.intakeJobs,
      deviceId: sources.deviceId,
      stuckIntakePhotos: sources.stuckIntakePhotos,
      money,
      trendWindow,
      companyId: sources.companyId,
      organizationName: companyName,
      offline: sources.offline,
      actions: shell.actionItems,
      preferences: EMPTY_HOME_PREFERENCES,
    });
  }, [
    canReadMoney,
    companyName,
    role,
    shell.actionItems,
    sources.companyId,
    sources.deviceId,
    sources.intakeJobs,
    sources.items,
    sources.modules,
    sources.motors,
    sources.offline,
    sources.operations,
    sources.orders,
    sources.payroll,
    sources.permissions,
    sources.ready,
    sources.stuckIntakePhotos,
    sources.uid,
    trendPeriod,
  ]);

  /**
   * The brief saved on this device, read synchronously so it is on screen in the
   * first frame rather than a render later.
   *
   * Keyed to (company, reader, range) so the read happens once per combination
   * instead of on every snapshot that lands — a cheap MMKV hit, but one on the
   * paint path producing a value that is about to be replaced by live data.
   */
  const cachedBrief = useMemo(
    () => readHomeSnapshot(sources.companyId, sources.uid, trendPeriod),
    [sources.companyId, sources.uid, trendPeriod],
  );

  /**
   * Live wins the moment it is trustworthy; until then the reader sees the last
   * answer instead of an empty screen filling in section by section.
   */
  const model = useMemo(() => {
    if (live.meta.ready) return live;
    return cachedBrief ? restoreHomeFromCache(live, cachedBrief) : live;
  }, [cachedBrief, live]);

  useEffect(() => {
    writeHomeSnapshot(sources.companyId, sources.uid, live);
  }, [live, sources.companyId, sources.uid]);

  const setPeriod = useCallback(
    (period: HomePeriodId) => setTrendPeriod(period),
    [setTrendPeriod],
  );

  return { model, trendPeriod, setTrendPeriod: setPeriod };
}
