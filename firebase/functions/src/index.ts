import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

import {
  billingIntervalFromPriceId,
  checkoutSessionEmail,
  createCompanyStripeCheckout,
  createMarketingStripeCheckout,
  createStripeBillingPortal,
  createStripeCustomer,
  isProStripeStatus,
  retrieveStripeCheckoutSession,
  retrieveStripeSubscription,
  stripeObjectId,
  subscriptionPeriodEnd,
  type BillingInterval,
} from "./stripe-shared";

initializeApp();

const billingFunctions = functions.region("us-central1");

function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Stripe не настроен. Задайте STRIPE_SECRET_KEY в firebase/functions/.env или через npm run deploy:billing-functions.",
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

async function assertCompanyOwner(companyId: string, uid: string) {
  const db = getFirestore();
  const companySnap = await db.collection("companies").doc(companyId).get();
  if (!companySnap.exists) {
    throw new functions.https.HttpsError("not-found", "Компания не найдена");
  }
  if (String(companySnap.data()?.ownerId ?? "") !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только владелец компании может управлять подпиской",
    );
  }
  return companySnap;
}

async function readUserEmail(uid: string): Promise<{ email: string; name: string }> {
  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  const data = userSnap.data() ?? {};
  return {
    email: String(data.email ?? "").trim().toLowerCase(),
    name: String(data.name ?? data.fullName ?? "").trim(),
  };
}

async function ensureStripeCustomerId(params: {
  companyId: string;
  uid: string;
  secretKey: string;
}): Promise<string> {
  const db = getFirestore();
  const subRef = db.collection("companies").doc(params.companyId).collection("billing").doc("subscription");
  const subSnap = await subRef.get();
  const existing = String(subSnap.data()?.stripeCustomerId ?? "").trim();
  if (existing) return existing;

  const profile = await readUserEmail(params.uid);
  const customerId = await createStripeCustomer({
    secretKey: params.secretKey,
    companyId: params.companyId,
    email: profile.email || undefined,
    name: profile.name || undefined,
  });

  await subRef.set(
    {
      stripeCustomerId: customerId,
      provider: "stripe",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return customerId;
}

function subscriptionDocFromStripe(subscription: Awaited<ReturnType<typeof retrieveStripeSubscription>>) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const status = subscription.status || "incomplete";
  const proActive = isProStripeStatus(status);
  const periodEnd = subscriptionPeriodEnd(subscription);

  return {
    plan: proActive ? "pro" : "free",
    status,
    proActive,
    provider: "stripe" as const,
    stripeCustomerId: stripeObjectId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    priceId: priceId ?? null,
    billingInterval: billingIntervalFromPriceId(priceId),
    currentPeriodEnd: periodEnd ? Timestamp.fromMillis(periodEnd * 1000) : null,
    stripeUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const createMarketingCheckoutSession = billingFunctions.https.onCall(async (data) => {
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

export const createCheckoutSession = billingFunctions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Войдите в аккаунт");
  }

  const companyId = typeof data?.companyId === "string" ? data.companyId.trim() : "";
  const priceId = typeof data?.priceId === "string" ? data.priceId.trim() : "";
  if (!companyId || !priceId) {
    throw new functions.https.HttpsError("invalid-argument", "Нужны companyId и priceId");
  }

  await assertCompanyOwner(companyId, context.auth.uid);

  const returnOrigin = normalizeOrigin(
    data?.returnOrigin,
    process.env.APP_URL || "https://app.myautocore.com",
  );

  try {
    const secretKey = stripeSecretKey();
    const customerId = await ensureStripeCustomerId({
      companyId,
      uid: context.auth.uid,
      secretKey,
    });

    return await createCompanyStripeCheckout({
      secretKey,
      companyId,
      priceId,
      customerId,
      successUrl: `${returnOrigin}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${returnOrigin}/settings?checkout=canceled`,
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      "failed-precondition",
      error instanceof Error ? error.message : "Не удалось начать оплату",
    );
  }
});

export const createBillingPortalSession = billingFunctions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Войдите в аккаунт");
  }

  const companyId = typeof data?.companyId === "string" ? data.companyId.trim() : "";
  if (!companyId) {
    throw new functions.https.HttpsError("invalid-argument", "Нужен companyId");
  }

  await assertCompanyOwner(companyId, context.auth.uid);

  const returnOrigin = normalizeOrigin(
    data?.returnOrigin,
    process.env.APP_URL || "https://app.myautocore.com",
  );

  const db = getFirestore();
  const subSnap = await db
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription")
    .get();

  const customerId = String(subSnap.data()?.stripeCustomerId ?? "").trim();
  if (!customerId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Stripe customer ещё не создан. Сначала оформите Pro.",
    );
  }

  try {
    const url = await createStripeBillingPortal({
      secretKey: stripeSecretKey(),
      customerId,
      returnUrl: `${returnOrigin}/settings`,
    });
    return { url };
  } catch (error) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      error instanceof Error ? error.message : "Не удалось открыть портал оплаты",
    );
  }
});

export const syncCompanyBilling = billingFunctions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Войдите в аккаунт");
  }

  const companyId = typeof data?.companyId === "string" ? data.companyId.trim() : "";
  if (!companyId) {
    throw new functions.https.HttpsError("invalid-argument", "Нужен companyId");
  }

  await assertCompanyOwner(companyId, context.auth.uid);

  const db = getFirestore();
  const subRef = db.collection("companies").doc(companyId).collection("billing").doc("subscription");
  const subSnap = await subRef.get();
  const subData = subSnap.data() ?? {};

  const secretKey = stripeSecretKey();
  let subscriptionId = String(subData.stripeSubscriptionId ?? "").trim();

  if (!subscriptionId) {
    const sessionId = typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
    if (sessionId) {
      const session = await retrieveStripeCheckoutSession(secretKey, sessionId);
      if (session.metadata?.companyId && session.metadata.companyId !== companyId) {
        throw new functions.https.HttpsError("permission-denied", "Сессия оплаты не относится к этой компании");
      }
      subscriptionId = stripeObjectId(session.subscription) ?? "";
    }
  }

  if (!subscriptionId) {
    return { proActive: Boolean(subData.proActive) };
  }

  try {
    const subscription = await retrieveStripeSubscription(secretKey, subscriptionId);
    const patch = subscriptionDocFromStripe(subscription);
    await subRef.set(patch, { merge: true });
    return { proActive: patch.proActive };
  } catch (error) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      error instanceof Error ? error.message : "Не удалось синхронизировать подписку",
    );
  }
});

export const claimMarketingCheckout = billingFunctions.https.onCall(async (data, context) => {
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

  const secretKey = stripeSecretKey();
  const session = await retrieveStripeCheckoutSession(secretKey, sessionId);
  if (session.metadata?.flow !== "marketing_pro") {
    throw new functions.https.HttpsError("invalid-argument", "Сессия оплаты не относится к маркетинговому тарифу");
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    throw new functions.https.HttpsError("failed-precondition", "Оплата ещё не завершена");
  }

  const checkoutEmail = checkoutSessionEmail(session);
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  const authEmail = String(context.auth.token.email ?? "")
    .trim()
    .toLowerCase();
  const userEmail = String(userSnap.data()?.email ?? authEmail)
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

  const subscriptionId = stripeObjectId(session.subscription);
  let patch: Record<string, unknown> = {
    plan: "pro",
    status: "active",
    proActive: true,
    provider: "stripe",
    stripeCustomerId: stripeObjectId(session.customer),
    stripeSubscriptionId: subscriptionId,
    priceId,
    billingInterval: interval,
    stripeUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    marketingCheckoutSessionId: sessionId,
  };

  if (subscriptionId) {
    try {
      const subscription = await retrieveStripeSubscription(secretKey, subscriptionId);
      patch = subscriptionDocFromStripe(subscription);
      patch.marketingCheckoutSessionId = sessionId;
    } catch {
      // Keep checkout-session fallback when subscription read is delayed.
    }
  }

  await db
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription")
    .set(patch, { merge: true });

  return { proActive: true };
});
