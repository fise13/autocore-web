import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

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
    console.error("[notification-push] Expo API error", response.status, text);
  }
}

/** Reliable push delivery when a notification doc is created (independent of Next.js deploy). */
export const onNotificationCreatedPush = functions
  .region("us-central1")
  .firestore.document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const userId = String(data.userId ?? "");
    const channels = Array.isArray(data.channelsDelivered) ? data.channelsDelivered : [];
    if (!userId || !channels.includes("push")) return;
    if (data.pushDispatchedAt) return;

    const db = getFirestore();
    const devicesSnap = await db.collection("users").doc(userId).collection("devices").get();
    const tokens = devicesSnap.docs
      .map((doc) => String(doc.data().pushToken ?? "").trim())
      .filter((token) => token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

    if (tokens.length === 0) {
      console.warn("[notification-push] no devices", { userId, notificationId: snap.id });
      return;
    }

    const companyId = String(data.companyId ?? "");
    const unreadSnap = await db.collection("notifications").where("userId", "==", userId).get();
    const badge = unreadSnap.docs.reduce((count, doc) => {
      const item = doc.data();
      return count + (item.companyId === companyId && item.state === "unread" ? 1 : 0);
    }, 0);

    const priority = data.priority === "critical" ? "high" : "default";

    await sendExpoPush(
      tokens.map((token) => ({
        to: token,
        title: String(data.title ?? "AutoCore"),
        body: String(data.body ?? ""),
        sound: "default",
        priority,
        badge,
        channelId: data.priority === "critical" ? "critical" : "default",
        data: {
          notificationId: snap.id,
          eventType: String(data.eventType ?? ""),
          deepLink: String(data.deepLink ?? ""),
          companyId,
        },
      })),
    );

    await snap.ref.set({ pushDispatchedAt: new Date().toISOString() }, { merge: true });
  });
