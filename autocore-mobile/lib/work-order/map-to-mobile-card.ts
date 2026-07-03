import type { WorkOrder } from '@/types/work-order';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import type { OrderFilterId, OrderStatus, WorkOrder as MobileWorkOrder } from '@/features/orders/types';

function mapDomainStatusToMobile(status: WorkOrder['status']): OrderStatus {
  if (status === 'waiting_parts') return 'waiting_parts';
  if (status === 'completed' || status === 'delivered') return 'completed';
  if (status === 'in_progress' || status === 'confirmed') return 'in_progress';
  if (status === 'cancelled') return 'completed';
  return 'in_progress';
}

function estimateProgress(status: WorkOrder['status']): number {
  switch (status) {
    case 'draft':
      return 10;
    case 'confirmed':
      return 25;
    case 'waiting_parts':
      return 45;
    case 'in_progress':
      return 60;
    case 'completed':
      return 92;
    case 'delivered':
      return 100;
    case 'cancelled':
      return 0;
    default:
      return 35;
  }
}

function formatTimeLabel(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function mapWorkOrderToMobileCard(order: WorkOrder): MobileWorkOrder {
  const assignee =
    order.laborLines[0]?.assigneeDisplayNames?.[0] ??
    (order.laborLines[0]?.assigneeIds.length ? 'Назначен' : undefined);

  return {
    id: order.id,
    number: order.number,
    customer: order.clientName?.trim() || 'Клиент',
    phone: order.clientPhone?.trim() || undefined,
    vehicle: order.vehicleLabel?.trim() || 'Автомобиль',
    engine: order.motorLines[0]?.engineCode || order.motorLines[0]?.serialCode || '—',
    licensePlate: order.licensePlate || undefined,
    vin: order.vin || undefined,
    assignee,
    price: order.pricing.grandTotal,
    status: mapDomainStatusToMobile(order.status),
    priority: order.status === 'waiting_parts' ? 'high' : 'normal',
    progress: estimateProgress(order.status),
    estimated: isOpenStatus(order.status) ? 'В работе' : 'Закрыт',
    createdAt: formatTimeLabel(order.updatedAt),
    partsNote: order.partLines.length > 0 ? `${order.partLines.length} поз.` : undefined,
    timeline: [
      {
        id: `${order.id}-created`,
        title: 'Создан',
        time: formatTimeLabel(order.createdAt),
        done: true,
      },
      {
        id: `${order.id}-status`,
        title: order.status === 'draft' ? 'Черновик' : 'Текущий статус',
        time: formatTimeLabel(order.updatedAt),
        done: order.status !== 'draft',
      },
    ],
  };
}

export function filterMobileOrders(
  orders: MobileWorkOrder[],
  filter: OrderFilterId,
  query: string,
): MobileWorkOrder[] {
  const normalizedQuery = query.trim().toLowerCase();
  return orders.filter((order) => {
    if (filter === 'open' && order.status === 'completed') return false;
    if (filter === 'done' && order.status !== 'completed') return false;
    if (!normalizedQuery) return true;
    const haystack = [
      order.number,
      order.customer,
      order.phone,
      order.vehicle,
      order.licensePlate,
      order.vin,
      order.assignee,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function computeMobileOrdersMeta(orders: MobileWorkOrder[]) {
  const openCount = orders.filter((order) => order.status !== 'completed').length;
  return { total: orders.length, openCount };
}
