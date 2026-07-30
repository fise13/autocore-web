/**
 * Order workflow notification helpers.
 * Call from hooks/services — never from screen components directly.
 */
import { ORDER_EVENTS } from './event-types';
import { buildOrderDeepLink } from './deep-link-resolver';
import { NotificationService } from './notification-service';
import type { AppNotificationPriority } from './types';

type OrderNotifyOptions = {
  orderId: string;
  title: string;
  message: string;
  priority?: AppNotificationPriority;
  type?: string;
};

function orderNotify({
  orderId,
  title,
  message,
  priority = 'normal',
  type,
}: OrderNotifyOptions): void {
  NotificationService.notify({
    type: type ?? ORDER_EVENTS.EDITED,
    category: 'order',
    priority,
    title,
    message,
    deepLink: buildOrderDeepLink(orderId),
    payload: { orderId },
  });
}

export const OrderNotifications = {
  assigned: (orderId: string, assigneeName?: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.ASSIGNED,
      priority: 'important',
      title: 'Work order assigned',
      message: assigneeName ? `Assigned to: ${assigneeName}` : 'A new work order was assigned to you',
    }),

  completed: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.COMPLETED,
      priority: 'normal',
      title: 'Work order completed',
      message: 'The work order has been completed',
    }),

  statusChanged: (orderId: string, statusLabel: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.STATUS_CHANGED,
      priority: 'normal',
      title: 'Status changed',
      message: statusLabel,
    }),

  edited: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.EDITED,
      priority: 'silent',
      title: 'Work order edited',
      message: 'Work order details were updated',
    }),

  customerChanged: (orderId: string, customerName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.CUSTOMER_CHANGED,
      priority: 'normal',
      title: 'Customer changed',
      message: customerName,
    }),

  vehicleChanged: (orderId: string, vehicleLabel: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.VEHICLE_CHANGED,
      priority: 'normal',
      title: 'Vehicle changed',
      message: vehicleLabel,
    }),

  mechanicChanged: (orderId: string, mechanicName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.MECHANIC_CHANGED,
      priority: 'normal',
      title: 'Mechanic changed',
      message: mechanicName,
    }),

  partAdded: (orderId: string, partName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PART_ADDED,
      priority: 'silent',
      title: 'Part added',
      message: partName,
    }),

  commentAdded: (orderId: string, authorName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.COMMENT_ADDED,
      priority: 'normal',
      title: 'New comment',
      message: authorName,
    }),

  cancelled: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.CANCELLED,
      priority: 'important',
      title: 'Work order cancelled',
      message: 'The work order was cancelled',
    }),

  paymentAttached: (orderId: string, amount: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PAYMENT_ATTACHED,
      priority: 'normal',
      title: 'Payment attached',
      message: amount,
    }),

  paymentRemoved: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PAYMENT_REMOVED,
      priority: 'normal',
      title: 'Payment removed',
      message: 'Payment was detached from the work order',
    }),

  liveEditing: (orderId: string, editorName: string) =>
    NotificationService.notifyOrderLiveEditing(orderId, editorName),
};
