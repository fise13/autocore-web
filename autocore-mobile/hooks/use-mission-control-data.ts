import { useMemo } from 'react';

import {
  ClipboardListIcon,
  PackageIcon,
  PlusIcon,
  ScanSearchIcon,
  SearchIcon,
  ShoppingCartIcon,
} from '@/assets/icons';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { useSession } from '@/hooks/use-session';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import type { MissionControlSnapshot } from '@/features/mission-control/types';
import { formatPrice } from '@/features/search/lib/format';

export function useMissionControlData(): MissionControlSnapshot {
  const { companyId } = useSession();
  const { domainOrders, meta } = useWorkOrdersRealtime(companyId);
  const { items } = useInventoryCatalog(companyId);

  return useMemo(() => {
    const inProgress = domainOrders.filter((order) => order.status === 'in_progress').length;
    const waitingParts = domainOrders.filter((order) => order.status === 'waiting_parts').length;
    const salesToday = domainOrders
      .filter((order) => ['completed', 'delivered'].includes(order.status))
      .reduce((sum, order) => sum + order.pricing.grandTotal, 0);

    const lowStock = items.filter(
      (item) => item.totalAvailable > 0 && item.totalAvailable <= 3,
    ).length;

    return {
      attention: {
        title: 'Требует внимания',
        items: [
          ...(waitingParts > 0
            ? [{ count: waitingParts, text: 'нарядов ждут запчасти', tone: 'warning' as const }]
            : []),
          ...(lowStock > 0
            ? [{ count: lowStock, text: 'позиций на исходе', tone: 'warning' as const }]
            : []),
        ],
      },
      overview: [
        {
          id: 'sales',
          label: 'Закрыто',
          value: formatPrice(salesToday),
          numericValue: salesToday,
          hint: 'выручка по закрытым',
          hintTone: 'muted',
          trend: [salesToday * 0.7, salesToday * 0.8, salesToday * 0.9, salesToday],
          trendTone: 'primary',
        },
        {
          id: 'orders',
          label: 'Наряды',
          value: String(meta.total),
          numericValue: meta.total,
          hint: `${inProgress} в работе`,
          hintTone: 'muted',
          trend: [meta.openCount, meta.total, inProgress, waitingParts],
          trendTone: 'success',
        },
        {
          id: 'reservations',
          label: 'Открытые',
          value: String(meta.openCount),
          numericValue: meta.openCount,
          hint: 'активные',
          hintTone: 'muted',
          trend: [meta.openCount, meta.openCount, meta.openCount, meta.openCount],
          trendTone: 'chart2',
        },
        {
          id: 'warehouse',
          label: 'Склад',
          value: String(items.length),
          numericValue: items.length,
          hint: 'позиции',
          hintTone: 'muted',
          trend: [items.length, items.length, items.length, items.length],
          trendTone: 'muted',
        },
      ],
      quickActions: [
        {
          id: 'scan',
          label: 'Сканировать QR',
          icon: ScanSearchIcon,
          route: '/(tabs)/scan',
          primary: true,
        },
        { id: 'order', label: 'Новый наряд', icon: PlusIcon, route: '/(tabs)/orders' },
        { id: 'search', label: 'Поиск', icon: SearchIcon, route: '/(tabs)/search' },
        { id: 'sale', label: 'Продажа', icon: ShoppingCartIcon },
      ],
      activity: domainOrders.slice(0, 6).map((order) => ({
        id: order.id,
        title: `Заказ-наряд №${order.number}`,
        detail: order.vehicleLabel || order.clientName || 'Обновление',
        time: order.updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        category: 'order' as const,
        icon: order.partLines.length > 0 ? PackageIcon : ClipboardListIcon,
      })),
      companies: [],
    };
  }, [domainOrders, items.length, meta.openCount, meta.total]);
}
