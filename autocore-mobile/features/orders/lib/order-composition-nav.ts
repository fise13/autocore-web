import type { Href } from 'expo-router';

import type { WorkOrderMotorOutcome } from '@/types/work-order';

type CompositionRouter = {
  push: (href: Href) => void;
};

export function navigateNewOrderWithPart(router: CompositionRouter, itemId: string): void {
  router.push(`/orders/new?itemId=${encodeURIComponent(itemId)}` as Href);
}

export function navigateNewOrderWithMotor(
  router: CompositionRouter,
  motorId: string,
  outcome: WorkOrderMotorOutcome = 'install',
): void {
  router.push(
    `/orders/new?motorId=${encodeURIComponent(motorId)}&outcome=${outcome}` as Href,
  );
}

export function navigateEditOrderWithPart(
  router: CompositionRouter,
  orderId: string,
  itemId: string,
): void {
  router.push(
    `/orders/${encodeURIComponent(orderId)}/edit?itemId=${encodeURIComponent(itemId)}` as Href,
  );
}

export function navigateEditOrderWithMotor(
  router: CompositionRouter,
  orderId: string,
  motorId: string,
  outcome: WorkOrderMotorOutcome = 'install',
): void {
  router.push(
    `/orders/${encodeURIComponent(orderId)}/edit?motorId=${encodeURIComponent(motorId)}&outcome=${outcome}` as Href,
  );
}

export function navigateOrderEdit(router: CompositionRouter, orderId: string): void {
  router.push(`/orders/${encodeURIComponent(orderId)}/edit` as Href);
}
