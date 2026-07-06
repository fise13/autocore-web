import { useMemo } from 'react';

import {
  BarChart3Icon,
  BoxIcon,
  ClipboardListIcon,
  PackageIcon,
  PlusIcon,
  ScanSearchIcon,
} from '@/assets/icons';
import { useClientsRealtime } from '@/hooks/use-clients-realtime';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { useMotorsRealtime } from '@/hooks/use-motors-realtime';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { useSession } from '@/hooks/use-session';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import type {
  MissionControlActivity,
  MissionControlAttentionItem,
  MissionControlInsight,
  MissionControlSnapshot,
  MissionControlStatTile,
  MissionControlWeekBar,
} from '@/features/mission-control/types';
import { formatActivityTime } from '@/features/mission-control/utils/relative-time';
import { resolveMissionControlRevenue } from '@/features/mission-control/lib/revenue-from-operations';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { isMotorStale, isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { isOpenStatus, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import type { WorkOrder, WorkOrderStatus } from '@/types/work-order';

const WEEKDAY_SHORT_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

function weekDayShortLabel(date: Date): string {
  return WEEKDAY_SHORT_RU[date.getDay()] ?? '';
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

function buildWeekBars(orders: WorkOrder[], now: Date): MissionControlWeekBar[] {
  const bars: MissionControlWeekBar[] = [];
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

function statusTone(status: WorkOrderStatus): MissionControlActivity['statusTone'] {
  if (status === 'waiting_parts') return 'warning';
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'cancelled') return 'muted';
  return 'default';
}

export function useMissionControlData(): MissionControlSnapshot {
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const accountingEnabled = useCompanyModuleEnabled('accounting') && rbac.scopes.accounting !== 'none';
  const { domainOrders, meta } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });
  const { operations } = useOperationsRealtime(
    rbac.scopes.accounting !== 'none' ? companyId : null,
    { keepAlive: true },
  );
  const { items } = useInventoryCatalog(rbac.scopes.inventory !== 'none' ? companyId : null);
  const { availableMotors } = useMotorsRealtime(
    rbac.scopes.motors !== 'none' ? companyId : null,
    uid,
    motorsEnabled && rbac.scopes.motors !== 'none',
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

    const revenue = resolveMissionControlRevenue({
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

    const attentionItems: MissionControlAttentionItem[] = [];
    if (waitingParts > 0) {
      attentionItems.push({
        count: waitingParts,
        text: 'ждут запчасти',
        tone: 'warning',
        route: '/(tabs)/orders',
      });
    }
    if (lowStock > 0) {
      attentionItems.push({
        count: lowStock,
        text: 'на исходе',
        tone: 'warning',
        route: '/(tabs)/warehouse',
        routeParams: { lowStock: '1' },
      });
    }
    if (staleMotors > 0) {
      attentionItems.push({
        count: staleMotors,
        text: 'моторов залежались',
        tone: 'warning',
        route: '/(tabs)/search',
        routeParams: { filter: 'motors', stale: '1' },
      });
    }

    const statTiles: MissionControlStatTile[] = [];

    if (rbac.scopes.workOrders !== 'none') {
      statTiles.push({
        id: 'new-orders',
        label: 'Новые наряды',
        value: newOrdersWeek,
        format: 'integer',
        icon: ClipboardListIcon,
        route: '/(tabs)/orders',
      });
    }

    if (rbac.scopes.inventory !== 'none') {
      statTiles.push({
        id: 'inventory',
        label: 'Позиций на складе',
        value: items.length,
        format: 'grouped',
        icon: BoxIcon,
        route: '/(tabs)/warehouse',
      });
    }

    const insights: MissionControlInsight[] = [];
    let featuredInsight: MissionControlInsight | null = null;

    if (staleMotors > 0) {
      featuredInsight = {
        id: 'stale-motors',
        title: `${staleMotors} моторов залежались на складе`,
        detail: 'Позиции давно без движения — стоит пересмотреть цену или продвижение.',
        body: 'Обновление цен может ускорить продажи и освободить оборотные средства.',
        cta: 'Смотреть рекомендации',
        tone: 'neutral',
        route: '/(tabs)/search',
        routeParams: { filter: 'motors', stale: '1' },
      };
    } else if (lowStock > 0) {
      featuredInsight = {
        id: 'low-stock',
        title: `${lowStock} позиций на исходе`,
        detail: 'Запасы подходят к минимуму — риск простоя в нарядах.',
        body: 'Пополните склад заранее, чтобы не задерживать закрытие нарядов.',
        cta: 'Открыть список',
        tone: 'warning',
        route: '/(tabs)/warehouse',
        routeParams: { lowStock: '1' },
      };
    } else if (openOrders.length > 0 && now.getHours() >= 18) {
      featuredInsight = {
        id: 'open-evening',
        title: `${openOrders.length} нарядов ещё открыты`,
        detail: 'К концу дня стоит закрыть или обновить статусы.',
        cta: 'Перейти к нарядам',
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
          title: 'Хороший темп закрытия нарядов',
          detail: `${closedShare}% нарядов уже закрыто.`,
          body: 'Сохраняйте ритм — это помогает точнее планировать выручку.',
          cta: 'Смотреть наряды',
          tone: 'positive',
          route: '/(tabs)/orders',
        };
      }
    }

    if (openOrders.length > 0 && now.getHours() >= 18 && featuredInsight?.id !== 'open-evening') {
      insights.push({
        id: 'open-evening-secondary',
        title: 'Незакрытые наряды',
        detail: `${openOrders.length} к концу дня`,
        tone: 'neutral',
        route: '/(tabs)/orders',
      });
    }

    const recentOrders = [...domainOrders].sort((a, b) => {
      const aTime = coerceToDate(a.updatedAt)?.getTime() ?? 0;
      const bTime = coerceToDate(b.updatedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });

    const activity: MissionControlActivity[] = recentOrders.slice(0, 20).map((order) => {
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

    const quickActions = [
      rbac.can('work_orders_edit')
        ? { id: 'order', label: 'Наряд', icon: PlusIcon, route: '/(tabs)/orders/new' as const }
        : null,
      rbac.scopes.inventory !== 'none'
        ? { id: 'scan', label: 'Скан', icon: ScanSearchIcon, route: '/(tabs)/scan' as const }
        : null,
      rbac.scopes.inventory !== 'none'
        ? { id: 'inventory', label: 'Склад', icon: BoxIcon, route: '/(tabs)/warehouse' as const }
        : null,
      rbac.scopes.accounting !== 'none'
        ? { id: 'finance', label: 'Финансы', icon: BarChart3Icon, route: '/(tabs)/accounting' as const }
        : null,
    ].filter((action): action is NonNullable<typeof action> => action !== null);

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
        title: 'Нужно действие',
        items: attentionItems,
      },
      revenue: visibleRevenue,
      statTiles,
      quickActions,
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
