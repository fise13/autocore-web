import type { OrderStatus } from '../types';

export function isOpenOrderStatus(status: OrderStatus): boolean {
  return status !== 'completed';
}

export function formatWorkOrderLabel(number: string): string {
  return `Заказ-наряд №${number}`;
}

export function formatOrderVehicleLine(order: {
  licensePlate?: string;
  vin?: string;
  vehicle: string;
}): string {
  return order.licensePlate || order.vin || order.vehicle || '—';
}
