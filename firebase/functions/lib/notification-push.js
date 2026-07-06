"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreatedPush = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
async function sendExpoPush(messages) {
    if (messages.length === 0)
        return;
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
exports.onNotificationCreatedPush = functions
    .region("us-central1")
    .firestore.document("notifications/{notificationId}")
    .onCreate(async (snap) => {
    const data = snap.data();
    const userId = String(data.userId ?? "");
    const channels = Array.isArray(data.channelsDelivered) ? data.channelsDelivered : [];
    if (!userId || !channels.includes("push"))
        return;
    if (data.pushDispatchedAt)
        return;
    const db = (0, firestore_1.getFirestore)();
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
    await sendExpoPush(tokens.map((token) => ({
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
    })));
    await snap.ref.set({ pushDispatchedAt: new Date().toISOString() }, { merge: true });
});
//# sourceMappingURL=notification-push.js.map