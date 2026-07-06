import "server-only";

import type { NotificationRecord } from "@/domain/notifications";
import {
  countUnreadNotifications,
  listUserDevices,
} from "@/infrastructure/firestore/notification-repository.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";

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

  const chunks: ExpoPushMessage[][] = [];
  for (let index = 0; index < messages.length; index += 100) {
    chunks.push(messages.slice(index, index + 100));
  }

  for (const chunk of chunks) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[notifications/push] Expo API error", response.status, text);
      continue;
    }

    const payload = (await response.json().catch(() => null)) as {
      data?: Array<{ status?: string; message?: string; details?: { error?: string } }>;
    } | null;

    payload?.data?.forEach((ticket, index) => {
      if (ticket.status === "error") {
        console.warn("[notifications/push] ticket error", {
          token: chunk[index]?.to?.slice(0, 24),
          message: ticket.message,
          details: ticket.details,
        });
      }
    });
  }
}

export async function dispatchPushForNotification(
  uid: string,
  notification: NotificationRecord,
  options?: { badge?: number },
): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("notifications").doc(notification.id);
  const existing = await ref.get();
  if (existing.data()?.pushDispatchedAt) return;

  const devices = await listUserDevices(uid);
  const tokens = devices
    .map((device) => device.pushToken.trim())
    .filter((token) => token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

  if (tokens.length === 0) {
    console.warn("[notifications/push] no registered devices", { uid, notificationId: notification.id });
    return;
  }

  const priority = notification.priority === "critical" ? "high" : "default";
  const badge =
    options?.badge ??
    (await countUnreadNotifications(uid, notification.companyId).catch(() => undefined));

  await sendExpoPush(
    tokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      sound: notification.priority === "critical" ? "default" : "default",
      priority,
      ...(typeof badge === "number" ? { badge } : {}),
      channelId: notification.priority === "critical" ? "critical" : "default",
      data: {
        notificationId: notification.id,
        eventType: notification.eventType,
        deepLink: notification.deepLink ?? "",
        companyId: notification.companyId,
      },
    })),
  );

  await ref.set({ pushDispatchedAt: new Date().toISOString() }, { merge: true });
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
