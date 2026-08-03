import type { OrderStatus } from '../types';

export function isOpenOrderStatus(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'delivered' && status !== 'cancelled';
}

export function formatWorkOrderLabel(number: string): string {
  return `WO #${number}`;
}

export function formatOrderVehicleLine(order: {
  licensePlate?: string;
  vin?: string;
  vehicle: string;
}): string {
  return order.licensePlate || order.vin || order.vehicle || '—';
}

/**
 * One muted footnote for list rows — vehicle · engine · plate, without
 * repeating a plate already baked into the vehicle string.
 */
export function formatOrderListVehicleLine(order: {
  licensePlate?: string;
  vin?: string;
  vehicle: string;
  engine?: string;
}): string {
  const vehicle = order.vehicle?.trim() || '';
  const engine = order.engine && order.engine !== '—' ? order.engine.trim() : '';
  const plate = order.licensePlate?.trim() || '';
  const plateAlreadyInVehicle =
    Boolean(plate) && vehicle.toLowerCase().includes(plate.toLowerCase());

  return [vehicle || null, engine || null, plate && !plateAlreadyInVehicle ? plate : null]
    .filter(Boolean)
    .join(' · ');
}
