import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

import {
  BillingInterval,
  checkoutSessionEmail,
  createMarketingStripeCheckout,
  retrieveStripeCheckoutSession,
  stripeObjectId,
} from "./stripe-shared";

initializeApp();

function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Stripe не настроен. Добавьте STRIPE_SECRET_KEY в Firebase Functions.",
    );
  }
  return key;
}

function normalizeInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function normalizeOrigin(value: unknown, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
  return trimmed || fallback;
}

export const createMarketingCheckoutSession = functions
  .region("us-central1")
  .https.onCall(async (data) => {
    const interval = normalizeInterval(data?.interval);
    const appOrigin = normalizeOrigin(data?.returnOrigin, process.env.APP_URL || "https://app.myautocore.com");
    const marketingOrigin = normalizeOrigin(
      data?.marketingOrigin,
      process.env.MARKETING_URL || "https://myautocore.com",
    );

    try {
      return await createMarketingStripeCheckout({
        secretKey: stripeSecretKey(),
        interval,
        successUrl: `${appOrigin}/login?checkout=success&session_id={CHECKOUT_SESSION_ID}&interval=${interval}&signup=1`,
        cancelUrl: `${marketingOrigin}/pricing?checkout=canceled`,
      });
    } catch (error) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        error instanceof Error ? error.message : "Не удалось начать оплату",
      );
    }
  });

export const claimMarketingCheckout = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Войдите в аккаунт");
  }

  const companyId = typeof data?.companyId === "string" ? data.companyId.trim() : "";
  const sessionId = typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
  if (!companyId || !sessionId) {
    throw new functions.https.HttpsError("invalid-argument", "Нужны companyId и sessionId");
  }

  const db = getFirestore();
  const companySnap = await db.collection("companies").doc(companyId).get();
  if (!companySnap.exists) {
    throw new functions.https.HttpsError("not-found", "Компания не найдена");
  }
  if (String(companySnap.data()?.ownerId ?? "") !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Только владелец компании может активировать Pro");
  }

  const session = await retrieveStripeCheckoutSession(stripeSecretKey(), sessionId);
  if (session.metadata?.flow !== "marketing_pro") {
    throw new functions.https.HttpsError("invalid-argument", "Сессия оплаты не относится к маркетинговому тарифу");
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    throw new functions.https.HttpsError("failed-precondition", "Оплата ещё не завершена");
  }

  const checkoutEmail = checkoutSessionEmail(session);
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  const userEmail = String(userSnap.data()?.email ?? "")
    .trim()
    .toLowerCase();
  if (checkoutEmail && userEmail && checkoutEmail !== userEmail) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Email оплаты не совпадает с email аккаунта",
    );
  }

  const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
  const priceId =
    interval === "yearly"
      ? process.env.STRIPE_PRICE_PRO_YEARLY || "price_1TbiarHo5bmy0A9LD3SafymR"
      : process.env.STRIPE_PRICE_PRO_MONTHLY || "price_1TbiZUHo5bmy0A9LC86I6wJJ";

  await db
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription")
    .set(
      {
        plan: "pro",
        status: "active",
        proActive: true,
        provider: "stripe",
        stripeCustomerId: stripeObjectId(session.customer),
        stripeSubscriptionId: stripeObjectId(session.subscription),
        priceId,
        billingInterval: interval,
        stripeUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        marketingCheckoutSessionId: sessionId,
      },
      { merge: true },
    );

  return { proActive: true };
});
