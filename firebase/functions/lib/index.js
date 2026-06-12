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
exports.claimMarketingCheckout = exports.createMarketingCheckoutSession = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
const stripe_shared_1 = require("./stripe-shared");
(0, app_1.initializeApp)();
function stripeSecretKey() {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe не настроен. Добавьте STRIPE_SECRET_KEY в Firebase Functions.");
    }
    return key;
}
function normalizeInterval(value) {
    return value === "yearly" ? "yearly" : "monthly";
}
function normalizeOrigin(value, fallback) {
    const trimmed = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
    return trimmed || fallback;
}
exports.createMarketingCheckoutSession = functions
    .region("us-central1")
    .https.onCall(async (data) => {
    const interval = normalizeInterval(data?.interval);
    const appOrigin = normalizeOrigin(data?.returnOrigin, process.env.APP_URL || "https://app.myautocore.com");
    const marketingOrigin = normalizeOrigin(data?.marketingOrigin, process.env.MARKETING_URL || "https://myautocore.com");
    try {
        return await (0, stripe_shared_1.createMarketingStripeCheckout)({
            secretKey: stripeSecretKey(),
            interval,
            successUrl: `${appOrigin}/login?checkout=success&session_id={CHECKOUT_SESSION_ID}&interval=${interval}&signup=1`,
            cancelUrl: `${marketingOrigin}/pricing?checkout=canceled`,
        });
    }
    catch (error) {
        throw new functions.https.HttpsError("failed-precondition", error instanceof Error ? error.message : "Не удалось начать оплату");
    }
});
exports.claimMarketingCheckout = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functions.https.HttpsError("unauthenticated", "Войдите в аккаунт");
    }
    const companyId = typeof data?.companyId === "string" ? data.companyId.trim() : "";
    const sessionId = typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
    if (!companyId || !sessionId) {
        throw new functions.https.HttpsError("invalid-argument", "Нужны companyId и sessionId");
    }
    const db = (0, firestore_1.getFirestore)();
    const companySnap = await db.collection("companies").doc(companyId).get();
    if (!companySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Компания не найдена");
    }
    if (String(companySnap.data()?.ownerId ?? "") !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Только владелец компании может активировать Pro");
    }
    const session = await (0, stripe_shared_1.retrieveStripeCheckoutSession)(stripeSecretKey(), sessionId);
    if (session.metadata?.flow !== "marketing_pro") {
        throw new functions.https.HttpsError("invalid-argument", "Сессия оплаты не относится к маркетинговому тарифу");
    }
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        throw new functions.https.HttpsError("failed-precondition", "Оплата ещё не завершена");
    }
    const checkoutEmail = (0, stripe_shared_1.checkoutSessionEmail)(session);
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const userEmail = String(userSnap.data()?.email ?? "")
        .trim()
        .toLowerCase();
    if (checkoutEmail && userEmail && checkoutEmail !== userEmail) {
        throw new functions.https.HttpsError("permission-denied", "Email оплаты не совпадает с email аккаунта");
    }
    const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
    const priceId = interval === "yearly"
        ? process.env.STRIPE_PRICE_PRO_YEARLY || "price_1TbiarHo5bmy0A9LD3SafymR"
        : process.env.STRIPE_PRICE_PRO_MONTHLY || "price_1TbiZUHo5bmy0A9LC86I6wJJ";
    await db
        .collection("companies")
        .doc(companyId)
        .collection("billing")
        .doc("subscription")
        .set({
        plan: "pro",
        status: "active",
        proActive: true,
        provider: "stripe",
        stripeCustomerId: (0, stripe_shared_1.stripeObjectId)(session.customer),
        stripeSubscriptionId: (0, stripe_shared_1.stripeObjectId)(session.subscription),
        priceId,
        billingInterval: interval,
        stripeUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        marketingCheckoutSessionId: sessionId,
    }, { merge: true });
    return { proActive: true };
});
//# sourceMappingURL=index.js.map