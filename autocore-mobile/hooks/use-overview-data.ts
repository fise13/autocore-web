import { useMemo } from 'react';

import {
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
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { isMotorStale, isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import { isOpenStatus, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
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
    if (waitingParts > 0) {
      attentionItems.push({
        count: waitingParts,
        text: 'waiting on parts',
        tone: 'warning',
        route: '/(tabs)/orders',
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
        icon: ClipboardListIcon,
        route: '/(tabs)/orders',
      });
    }

    if (rbac.scopes.inventory !== 'none') {
      statTiles.push({
        id: 'inventory',
        label: 'In stock',
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
        title: `${staleMotors} idle motors`,
        detail: 'No movement in a while.',
        cta: 'Review',
        tone: 'neutral',
        route: '/search',
        routeParams: { filter: 'motors', stale: '1' },
      };
    } else if (lowStock > 0) {
      featuredInsight = {
        id: 'low-stock',
        title: `${lowStock} low stock`,
        detail: 'Near minimum levels.',
        cta: 'Open',
        tone: 'warning',
        route: '/warehouse',
        routeParams: { lowStock: '1' },
      };
    } else if (openOrders.length > 0 && now.getHours() >= 18) {
      featuredInsight = {
        id: 'open-evening',
        title: `${openOrders.length} still open`,
        detail: 'Update before end of day.',
        cta: 'Orders',
        tone: 'neutral',
        route: '/(tabs)/orders',
      };
    } else if (weekRevenue > 0 && meta.total > 0) {
      const closedShare = Math.round(
        (domainOrders.filter((o) => ['completed', 'delivered'].includes(o.status)).length / meta.total) *
          100,
      );
      if (closedShare >= 40 && closedShare < 100) {
        featuredInsight = {
          id: 'close-rate',
          title: `${closedShare}% closed`,
          detail: 'Work orders this period.',
          cta: 'Orders',
          tone: 'positive',
          route: '/(tabs)/orders',
        };
      }
    }

    if (openOrders.length > 0 && now.getHours() >= 18 && featuredInsight?.id !== 'open-evening') {
      insights.push({
        id: 'open-evening-secondary',
        title: 'Still open',
        detail: `${openOrders.length} orders`,
        tone: 'neutral',
        route: '/(tabs)/orders',
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
  ]);
}
