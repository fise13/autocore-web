import "server-only";

import type { NotificationRecord } from "@/domain/notifications";
import { listUserDevices } from "@/infrastructure/firestore/notification-repository.server";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "high";
  channelId?: string;
};

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[notifications/push] Expo API error", response.status, text);
  }
}

export async function dispatchPushForNotification(
  uid: string,
  notification: NotificationRecord,
): Promise<void> {
  const devices = await listUserDevices(uid);
  const tokens = devices
    .map((device) => device.pushToken.trim())
    .filter((token) => token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

  if (tokens.length === 0) return;

  const priority = notification.priority === "critical" ? "high" : "default";

  await sendExpoPush(
    tokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      sound: notification.priority === "critical" ? "default" : "default",
      priority,
      data: {
        notificationId: notification.id,
        eventType: notification.eventType,
        deepLink: notification.deepLink ?? "",
        companyId: notification.companyId,
      },
    })),
  );
}

export async function dispatchSilentBadgeUpdate(uid: string, badge: number): Promise<void> {
  const devices = await listUserDevices(uid);
  const tokens = devices.map((device) => device.pushToken).filter(Boolean);
  if (tokens.length === 0) return;

  await sendExpoPush(
    tokens.map((token) => ({
      to: token,
      title: "",
      body: "",
      badge,
      sound: null,
      priority: "default",
      data: { type: "badge_sync" },
    })),
  );
}
