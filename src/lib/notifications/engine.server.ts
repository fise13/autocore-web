import "server-only";

import type { NotificationEventContext } from "@/domain/notifications";
import {
  deliverNotificationToUser,
  resolveNotificationRecipients,
} from "@/infrastructure/firestore/notification-repository.server";
import { dispatchPushForNotification } from "@/lib/notifications/dispatch.server";

export type EmitNotificationResult = {
  recipients: number;
  delivered: number;
  notificationIds: string[];
};

/**
 * Notification Engine entry point.
 * Events → role-aware recipients → preferences → grouping → inbox → push.
 */
export async function emitNotificationEvent(
  ctx: NotificationEventContext,
): Promise<EmitNotificationResult> {
  const recipients = await resolveNotificationRecipients(ctx);
  const notificationIds: string[] = [];
  let delivered = 0;

  await Promise.all(
    recipients.map(async (user) => {
      try {
        const record = await deliverNotificationToUser({ user, ctx });
        if (!record) return;
        delivered += 1;
        notificationIds.push(record.id);

        if (record.channelsDelivered.includes("push")) {
          await dispatchPushForNotification(user.id, record);
        }
      } catch (error) {
        console.error("[notification-engine] delivery failed", {
          userId: user.id,
          eventType: ctx.eventType,
          error,
        });
      }
    }),
  );

  return {
    recipients: recipients.length,
    delivered,
    notificationIds,
  };
}

export async function emitNotificationEvents(
  contexts: NotificationEventContext[],
): Promise<EmitNotificationResult> {
  const merged: EmitNotificationResult = {
    recipients: 0,
    delivered: 0,
    notificationIds: [],
  };

  for (const ctx of contexts) {
    const result = await emitNotificationEvent(ctx);
    merged.recipients += result.recipients;
    merged.delivered += result.delivered;
    merged.notificationIds.push(...result.notificationIds);
  }

  return merged;
}
