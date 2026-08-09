import { useMemo } from 'react';

import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useOverviewData } from '@/hooks/use-overview-data';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';

import {
  buildAiInsight,
  buildAttentionRows,
  buildHomeNow,
  buildHomeToday,
  buildHomeTrend,
  buildOperationalHealth,
  countInProgressOrders,
  countOpenOrders,
  countStaleMotors,
  countTodayMotors,
  countTodayOrders,
  mapActivityRows,
  revenueTodayHint,
} from '../lib/build-home-dashboard';
import { resolveHomeLayout } from '../lib/resolve-home-layout';
import type {
  HomeActivityRow,
  HomeAiInsight,
  HomeAttentionRow,
  HomeBodySectionId,
  HomeHealthCard,
  HomeNow,
  HomeToday,
  HomeTrend,
} from '../types-home';

export type HomeDashboard = {
  now: HomeNow;
  today: HomeToday;
  trend: HomeTrend;
  health: HomeHealthCard[];
  attention: HomeAttentionRow[];
  activity: HomeActivityRow[];
  aiInsight: HomeAiInsight;
  layout: HomeBodySectionId[];
  isEmptyWorkspace: boolean;
  loading: boolean;
};

export function useHomeDashboard(): HomeDashboard {
  const overview = useOverviewData();
  const { companyId, uid, can, profile } = useSession();
  const rbac = useRbacPolicy();
  const { homeSections } = useShellModel();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const canIntake = motorsEnabled && can('engine_intake_view');
  const { jobs, loading: jobsLoading } = useEngineIntakeJobs(canIntake ? companyId : null);
  const outbox = useEngineIntakeOutbox(canIntake ? companyId : null);

  const { domainOrders } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const inventoryEnabled = rbac.scopes.inventory !== 'none' && Boolean(companyId);
  const motorsCacheEnabled =
    motorsEnabled && rbac.scopes.motors !== 'none' && Boolean(companyId) && Boolean(uid?.trim());

  const inventoryRaw = useSessionQueryData<InventoryItem[]>(
    ['realtime', 'inventory-items', companyId],
    inventoryEnabled,
    [],
  );
  const items = useMemo(() => inventoryRaw.map(normalizeInventoryItem), [inventoryRaw]);
  const motors = useSessionQueryData<MotorEntity[]>(
    ['realtime', 'motors', companyId, uid],
    motorsCacheEnabled,
    [],
  );

  return useMemo(() => {
    const nowDate = new Date();
    const availableMotors = motors.filter(
      (m) => !m.soldDate && (m.status ?? 'available') === 'available',
    );
    const openOrders = countOpenOrders(domainOrders);
    const ordersToday = countTodayOrders(domainOrders, nowDate);
    const receivedToday = countTodayMotors(motors, nowDate);
    const staleMotors = countStaleMotors(availableMotors);
    const waitingParts = domainOrders.filter((o) => o.status === 'waiting_parts').length;
    const lowStock = items.filter(isWarehouseLowStock).length;
    const showFinance =
      profile?.role === 'accountant' ||
      profile?.role === 'owner' ||
      profile?.role === 'admin' ||
      can('accounting_view') ||
      can('analytics_view');

    const attention = buildAttentionRows({
      jobs,
      waitingParts,
      lowStock,
      staleMotors,
      canIntake,
    });

    const today = buildHomeToday({
      ordersToday,
      receivedToday,
      readyToSell: motorsEnabled ? availableMotors.length : items.length,
      openOrders,
      showOrders: rbac.scopes.workOrders !== 'none',
      showMotors: motorsEnabled && rbac.scopes.motors !== 'none',
      showInventory: rbac.scopes.inventory !== 'none',
      motors,
      orders: domainOrders,
      now: nowDate,
    });

    const trend = buildHomeTrend({
      motorsEnabled: motorsEnabled && rbac.scopes.motors !== 'none',
      motors,
      orders: domainOrders,
      now: nowDate,
    });

    const health = buildOperationalHealth({
      motorsEnabled: motorsEnabled && rbac.scopes.motors !== 'none',
      availableMotors,
      jobs,
      items,
      openOrders,
      newOrdersToday: ordersToday,
      inProgressOrders: countInProgressOrders(domainOrders),
      revenueToday: showFinance ? revenueTodayHint(overview.revenue) : null,
      showOrders: rbac.scopes.workOrders !== 'none',
      showFinance: Boolean(showFinance),
    });

    const now = buildHomeNow({ jobs, openOrders, canIntake });
    const activity = mapActivityRows(overview.activity);
    const aiInsight = buildAiInsight({
      jobs,
      now: nowDate,
      outboxSyncing: outbox.syncing,
      outboxPending: outbox.pendingCount,
      canIntake,
    });

    const layout = resolveHomeLayout({
      homeSections,
      now,
      attention,
      today,
      trend,
      health,
      aiInsight,
      activity,
    });

    const loading = Boolean(companyId) && jobsLoading && jobs.length === 0;
    const isEmptyWorkspace =
      Boolean(companyId) &&
      !jobsLoading &&
      domainOrders.length === 0 &&
      motors.length === 0 &&
      items.length === 0 &&
      jobs.length === 0;

    return {
      now,
      today,
      trend,
      health,
      attention,
      activity,
      aiInsight,
      layout,
      isEmptyWorkspace,
      loading,
    };
  }, [
    can,
    canIntake,
    companyId,
    domainOrders,
    homeSections,
    items,
    jobs,
    jobsLoading,
    motors,
    motorsEnabled,
    outbox.pendingCount,
    outbox.syncing,
    overview.activity,
    overview.revenue,
    profile?.role,
    rbac.scopes.inventory,
    rbac.scopes.motors,
    rbac.scopes.workOrders,
  ]);
}
