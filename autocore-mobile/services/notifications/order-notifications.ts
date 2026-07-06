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
      title: 'Наряд назначен',
      message: assigneeName ? `Назначен: ${assigneeName}` : 'Вам назначен новый наряд',
    }),

  completed: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.COMPLETED,
      priority: 'normal',
      title: 'Наряд завершён',
      message: 'Работа по наряду выполнена',
    }),

  statusChanged: (orderId: string, statusLabel: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.STATUS_CHANGED,
      priority: 'normal',
      title: 'Статус изменён',
      message: statusLabel,
    }),

  edited: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.EDITED,
      priority: 'silent',
      title: 'Наряд изменён',
      message: 'Данные наряда обновлены',
    }),

  customerChanged: (orderId: string, customerName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.CUSTOMER_CHANGED,
      priority: 'normal',
      title: 'Клиент изменён',
      message: customerName,
    }),

  vehicleChanged: (orderId: string, vehicleLabel: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.VEHICLE_CHANGED,
      priority: 'normal',
      title: 'Автомобиль изменён',
      message: vehicleLabel,
    }),

  mechanicChanged: (orderId: string, mechanicName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.MECHANIC_CHANGED,
      priority: 'normal',
      title: 'Механик изменён',
      message: mechanicName,
    }),

  partAdded: (orderId: string, partName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PART_ADDED,
      priority: 'silent',
      title: 'Добавлена запчасть',
      message: partName,
    }),

  commentAdded: (orderId: string, authorName: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.COMMENT_ADDED,
      priority: 'normal',
      title: 'Новый комментарий',
      message: authorName,
    }),

  cancelled: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.CANCELLED,
      priority: 'important',
      title: 'Наряд отменён',
      message: 'Наряд был отменён',
    }),

  paymentAttached: (orderId: string, amount: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PAYMENT_ATTACHED,
      priority: 'normal',
      title: 'Платёж прикреплён',
      message: amount,
    }),

  paymentRemoved: (orderId: string) =>
    orderNotify({
      orderId,
      type: ORDER_EVENTS.PAYMENT_REMOVED,
      priority: 'normal',
      title: 'Платёж удалён',
      message: 'Платёж откреплён от наряда',
    }),

  liveEditing: (orderId: string, editorName: string) =>
    NotificationService.notifyOrderLiveEditing(orderId, editorName),
};
