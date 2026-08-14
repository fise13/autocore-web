import { useMemo } from 'react';

import {
  ShoppingCartIcon,
  BoxIcon,
  ClipboardListIcon,
  PackageIcon,
} from '@/assets/icons';
import { useClientsRealtime } from '@/hooks/use-clients-realtime';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import type {
  OverviewActivity,
  OverviewAttentionItem,
  OverviewInsight,
  OverviewSnapshot,
  OverviewStatTile,
  OverviewWeekBar,
} from '@/features/overview/types';
import { formatActivityTime } from '@/features/overview/utils/relative-time';
import { resolveOverviewRevenue } from '@/features/overview/lib/revenue-from-operations';
import {
  averageOfPoints,
  buildWeeklyClosedCounts,
  insightChartIsUseful,
} from '@/features/overview/lib/insight-chart';
import { isClaimableWorkOrder } from '@autocore/rbac';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { isMotorStale, isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import { isOpenStatus, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder, WorkOrderStatus } from '@/types/work-order';

const WEEKDAY_SHORT_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function weekDayShortLabel(date: Date): string {
  return WEEKDAY_SHORT_EN[date.getDay()] ?? '';
}

function orderRevenue(order: WorkOrder): number {
  const total = order.pricing?.grandTotal;
  if (typeof total === 'number' && Number.isFinite(total)) return total;

  const { laborTotal = 0, partsTotal = 0, motorsTotal = 0, discount = 0 } = order.pricing ?? {};
  return Math.max(0, laborTotal + partsTotal + motorsTotal - discount);
}

function safePercent(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return ((numerator - denominator) / denominator) * 100;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function closedRevenueForDay(orders: WorkOrder[], day: Date): number {
  return orders
    .filter((order) => {
      if (!['completed', 'delivered'].includes(order.status)) return false;
      const closedAt = coerceToDate(order.completedAt) ?? coerceToDate(order.updatedAt);
      return closedAt ? isSameDay(closedAt, day) : false;
    })
    .reduce((sum, order) => sum + orderRevenue(order), 0);
}

function sumRevenueForRange(orders: WorkOrder[], endDay: Date, days: number): number {
  let total = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(endDay);
    day.setDate(day.getDate() - offset);
    total += closedRevenueForDay(orders, day);
  }
  return total;
}

function buildWeekBars(orders: WorkOrder[], now: Date): OverviewWeekBar[] {
  const bars: OverviewWeekBar[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    bars.push({
      label: weekDayShortLabel(day),
      value: closedRevenueForDay(orders, day),
    });
  }
  return bars;
}

function statusTone(status: WorkOrderStatus): OverviewActivity['statusTone'] {
  if (status === 'waiting_parts') return 'warning';
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'cancelled') return 'muted';
  return 'default';
}

export function useOverviewData(): OverviewSnapshot {
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const accountingEnabled = useCompanyModuleEnabled('accounting') && rbac.scopes.accounting !== 'none';
  const { domainOrders, meta } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });
  const opsEnabled = rbac.scopes.accounting !== 'none' && Boolean(companyId);
  const inventoryEnabled = rbac.scopes.inventory !== 'none' && Boolean(companyId);
  const motorsCacheEnabled =
    motorsEnabled && rbac.scopes.motors !== 'none' && Boolean(companyId) && Boolean(uid?.trim());

  const operations = useSessionQueryData<FinancialOperation[]>(
    ['realtime', 'financial-operations', companyId],
    opsEnabled,
    [],
  );
  const inventoryRaw = useSessionQueryData<InventoryItem[]>(
    ['realtime', 'inventory-items', companyId],
    inventoryEnabled,
    [],
  );
  const items = useMemo(
    () => inventoryRaw.map(normalizeInventoryItem),
    [inventoryRaw],
  );
  const motors = useSessionQueryData<MotorEntity[]>(
    ['realtime', 'motors', companyId, uid],
    motorsCacheEnabled,
    [],
  );
  const payrollEnabled = rbac.nav.canAccessMyEarnings && Boolean(companyId);
  const rawPayroll = useSessionQueryData<PayrollTransaction[]>(
    ['realtime', 'payroll-transactions', companyId, rbac.scopes.payroll, uid],
    payrollEnabled,
    [],
  );
  const availableMotors = useMemo(
    () => motors.filter((motor) => !motor.soldDate && (motor.status ?? 'available') === 'available'),
    [motors],
  );
  useClientsRealtime(rbac.scopes.clients !== 'none' ? companyId : null, { keepAlive: true });

  return useMemo(() => {
    const now = new Date();
    const openOrders = domainOrders.filter((order) => isOpenStatus(order.status));
    const waitingParts = domainOrders.filter((order) => order.status === 'waiting_parts').length;

    const orderWeekRevenue = sumRevenueForRange(domainOrders, now, 7);
    const orderWeekBars = buildWeekBars(domainOrders, now);
    const orderWeekGrowth = safePercent(
      orderWeekRevenue,
      sumRevenueForRange(
        domainOrders,
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
        7,
      ),
    );
    const balanceTotal = calculateCashBalance(operations).total;

    const revenue = resolveOverviewRevenue({
      accountingEnabled,
      operations,
      orderWeekRevenue,
      orderWeekBars,
      orderWeekGrowth,
      balanceTotal,
      now,
    });
    const weekRevenue = revenue.value;

    const newOrdersWeek = domainOrders.filter((order) => {
      const created = coerceToDate(order.createdAt);
      if (!created) return false;
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length;

    const lowStock = items.filter(isWarehouseLowStock).length;
    const staleMotors = motorsEnabled ? availableMotors.filter((m) => isMotorStale(m)).length : 0;

    const attentionItems: OverviewAttentionItem[] = [];
    if (rbac.nav.canAccessMyEarnings && uid) {
      const ownPayroll = rawPayroll.filter((row) => row.employeeId === uid);
      const pendingPayouts = ownPayroll.filter((row) => row.status === 'pending').length;
      const claimable = domainOrders.filter((order) => isClaimableWorkOrder(order)).length;
      if (pendingPayouts > 0) {
        attentionItems.push({
          count: pendingPayouts,
          text: pendingPayouts === 1 ? 'payout waiting' : 'payouts waiting',
          tone: 'warning',
          route: '/earnings',
        });
      }
      if (claimable > 0) {
        attentionItems.push({
          count: claimable,
          text: 'open to claim',
          tone: 'warning',
          route: '/earnings',
        });
      }
    }
    if (waitingParts > 0) {
      attentionItems.push({
        count: waitingParts,
        text: 'waiting on parts',
        tone: 'warning',
        route: '/orders',
      });
    }
    if (lowStock > 0) {
      attentionItems.push({
        count: lowStock,
        text: 'running low',
        tone: 'warning',
        route: '/warehouse',
        routeParams: { lowStock: '1' },
      });
    }
    if (staleMotors > 0) {
      attentionItems.push({
        count: staleMotors,
        text: 'idle motors',
        tone: 'warning',
        route: '/search',
        routeParams: { filter: 'motors', stale: '1' },
      });
    }

    const statTiles: OverviewStatTile[] = [];

    if (rbac.scopes.workOrders !== 'none') {
      statTiles.push({
        id: 'new-orders',
        label: 'New orders',
        value: newOrdersWeek,
        format: 'integer',
        icon: ShoppingCartIcon,
        route: '/orders',
      });
    }

    if (rbac.scopes.inventory !== 'none') {
      statTiles.push({
        id: 'inventory',
        label: 'Parts in stock',
        value: items.length,
        format: 'grouped',
        icon: BoxIcon,
        route: '/warehouse',
      });
    }

    const insights: OverviewInsight[] = [];
    let featuredInsight: OverviewInsight | null = null;

    if (staleMotors > 0) {
      featuredInsight = {
        id: 'stale-motors',
        category: 'Idle engines',
        sf: 'engine.combustion',
        title: `${staleMotors} idle motors`,
        insight:
          staleMotors === 1
            ? '1 engine has had no movement in a while — review pricing or push it into an active listing.'
            : `${staleMotors} engines have had no movement in a while — review pricing or push them into active listings.`,
        cta: 'Review suggestions',
        tone: 'neutral',
        route: '/search',
        routeParams: { filter: 'motors', stale: '1' },
        // Count alert — no time series available → no chart
        chart: null,
      };
    } else if (lowStock > 0) {
      featuredInsight = {
        id: 'low-stock',
        category: 'Stock',
        sf: 'shippingbox',
        title: `${lowStock} low stock`,
        insight:
          lowStock === 1
            ? '1 part is near minimum levels — restock before jobs stall waiting on parts.'
            : `${lowStock} parts are near minimum levels — restock before jobs stall waiting on parts.`,
        cta: 'Review stock',
        tone: 'warning',
        route: '/warehouse',
        routeParams: { lowStock: '1' },
        chart: null,
      };
    } else if (openOrders.length > 0 && now.getHours() >= 18) {
      featuredInsight = {
        id: 'open-evening',
        category: 'Open orders',
        sf: 'wrench.and.screwdriver',
        title: `${openOrders.length} still open`,
        insight:
          openOrders.length === 1
            ? '1 order is still open — update status before end of day so the floor stays accurate overnight.'
            : `${openOrders.length} orders are still open — update status before end of day so the floor stays accurate overnight.`,
        cta: 'Open orders',
        tone: 'neutral',
        route: '/orders',
        chart: null,
      };
    } else if (weekRevenue > 0 && meta.total > 0) {
      const closedCount = domainOrders.filter((o) =>
        ['completed', 'delivered'].includes(o.status),
      ).length;
      const closedShare = Math.round((closedCount / meta.total) * 100);
      if (closedShare >= 40 && closedShare < 100) {
        const weeklyClosed = buildWeeklyClosedCounts(domainOrders, now, 6);
        const avgClosed = averageOfPoints(weeklyClosed);
        const latestClosed = weeklyClosed[weeklyClosed.length - 1]?.value ?? 0;
        const chartCandidate = {
          points: weeklyClosed,
          baseline: avgClosed,
          baselineLabel: 'Avg for 6 weeks',
          currentLabel: `This week · ${latestClosed}`,
        };
        const chart = insightChartIsUseful(chartCandidate) ? chartCandidate : null;

        featuredInsight = {
          id: 'close-rate',
          category: 'Close rate',
          sf: 'chart.xyaxis.line',
          title: `${closedShare}% closed`,
          insight: `Your close rate is ${closedShare}% this period — keep clearing waiting-parts jobs to push higher.`,
          cta: 'View orders',
          tone: 'positive',
          route: '/orders',
          compare: {
            primary: { label: 'Closed', value: `${closedShare}%` },
            secondary: { label: 'Open', value: `${Math.max(0, 100 - closedShare)}%` },
          },
          chart,
        };
      }
    }

    if (openOrders.length > 0 && now.getHours() >= 18 && featuredInsight?.id !== 'open-evening') {
      insights.push({
        id: 'open-evening-secondary',
        category: 'Open orders',
        sf: 'wrench.and.screwdriver',
        title: 'Still open',
        insight: `${openOrders.length} orders still need an update.`,
        detail: `${openOrders.length} orders`,
        tone: 'neutral',
        route: '/orders',
      });
    }

    const recentOrders = [...domainOrders].sort((a, b) => {
      const aTime = coerceToDate(a.updatedAt)?.getTime() ?? 0;
      const bTime = coerceToDate(b.updatedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });

    const activity: OverviewActivity[] = recentOrders.slice(0, 20).map((order) => {
      const updated = coerceToDate(order.updatedAt) ?? now;
      return {
        id: order.id,
        title: `№${order.number}`,
        detail: order.vehicleLabel || order.clientName || '—',
        time: formatActivityTime(updated, now),
        statusLabel: STATUS_LABELS[order.status],
        statusTone: statusTone(order.status),
        category: 'order' as const,
        icon: order.partLines.length > 0 ? PackageIcon : ClipboardListIcon,
      };
    });

    const visibleRevenue =
      rbac.can('accounting_view') || rbac.can('analytics_view')
        ? revenue
        : {
            ...revenue,
            value: 0,
            growthPercent: null,
            weekBars: revenue.weekBars.map((bar) => ({ ...bar, value: 0 })),
          };

    return {
      attention: {
        title: 'Attention',
        items: attentionItems,
      },
      revenue: visibleRevenue,
      statTiles,
      featuredInsight,
      insights: insights.slice(0, 2),
      activity,
      companies: [],
    };
  }, [
    accountingEnabled,
    availableMotors,
    domainOrders,
    items.length,
    meta.total,
    motorsEnabled,
    operations,
    rbac,
    rawPayroll,
    uid,
  ]);
}
