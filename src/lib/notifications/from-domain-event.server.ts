import "server-only";

import type { DomainEvent } from "@/domain/domain-event";
import type { NotificationEventContext, NotificationEventType } from "@/domain/notifications";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";

const DOMAIN_TO_NOTIFICATION: Partial<Record<DomainEvent["type"], NotificationEventType>> = {
  OrderCreated: "work_order.created",
  OrderConfirmed: "work_order.updated",
  OrderStarted: "work_order.updated",
  OrderWaitingParts: "work_order.waiting_parts",
  OrderCompleted: "work_order.completed",
  OrderDelivered: "work_order.completed",
  OrderCancelled: "work_order.updated",
  EngineReserved: "engine.reserved",
  EngineSold: "engine.sold",
  WarrantyActivated: "warranty.expiring",
};

function mapDomainEventToContext(
  event: DomainEvent,
  actorUserId: string,
  actorName?: string,
): NotificationEventContext | null {
  const eventType = DOMAIN_TO_NOTIFICATION[event.type];
  if (!eventType) return null;

  const payload = event.payload ?? {};
  const assigneeUserIds = Array.isArray(payload.assigneeUserIds)
    ? (payload.assigneeUserIds as string[])
    : typeof payload.assigneeUserId === "string"
      ? [payload.assigneeUserId]
      : undefined;

  return {
    companyId: event.companyId,
    eventType,
    actorUserId,
    actorName,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventId: event.id,
    payload: {
      ...payload,
      orderNumber: payload.orderNumber ?? payload.number,
      changeSummary: payload.changeSummary ?? event.type,
    },
    assigneeUserIds,
  };
}

export async function emitNotificationsFromDomainEvents(params: {
  events: DomainEvent[];
  actorUserId: string;
  actorName?: string;
}): Promise<void> {
  for (const event of params.events) {
    const ctx = mapDomainEventToContext(event, params.actorUserId, params.actorName);
    if (!ctx) continue;
    await emitNotificationEvent(ctx);
  }
}
