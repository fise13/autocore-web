import type { NotificationEventContext } from "@/domain/notifications";
import { getNotificationEventDefinition } from "@/domain/notifications";

export type GroupBucket = {
  id: string;
  userId: string;
  companyId: string;
  groupKey: string;
  eventType: string;
  count: number;
  notificationId: string;
  actorName?: string;
  expiresAt: string;
};

export function buildGroupBucketId(
  companyId: string,
  userId: string,
  groupKey: string,
): string {
  return `${companyId}_${userId}_${groupKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildGroupedCopy(params: {
  ctx: NotificationEventContext;
  count: number;
  actorName?: string;
}): { title: string; body: string } {
  const def = getNotificationEventDefinition(params.ctx.eventType);
  const base = def.buildCopy(params.ctx);
  const actor = params.actorName?.trim() || params.ctx.actorName?.trim() || "Сотрудник";

  if (params.count <= 1) {
    return base;
  }

  if (params.ctx.eventType === "work_order.created") {
    return {
      title: "Новые заказ-наряды",
      body: `${actor} создал ${params.count} новых наряда`,
    };
  }

  if (params.ctx.eventType === "work_order.completed") {
    return {
      title: "Завершённые наряды",
      body: `${params.count} нарядов закрыто`,
    };
  }

  if (params.ctx.eventType === "inventory.low_stock") {
    return {
      title: "Низкий остаток",
      body: `${params.count} позиций ниже минимума`,
    };
  }

  return {
    title: base.title,
    body: `${base.body} (${params.count})`,
  };
}

export function groupBucketExpiresAt(windowMinutes: number): string {
  return new Date(Date.now() + windowMinutes * 60_000).toISOString();
}

export function isGroupBucketActive(expiresAt: string): boolean {
  return Date.parse(expiresAt) > Date.now();
}
