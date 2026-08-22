import "server-only";

import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Subscription } from "@paddle/paddle-node-sdk";

import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";
import { paddleEventTimestamp, subscriptionDocFromPaddle } from "@/lib/paddle/subscription-doc";

function readCompanyIdFromCustomData(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const companyId = data.companyId ?? data.company_id;
  return typeof companyId === "string" && companyId.trim() ? companyId.trim() : null;
}

async function resolveCompanyId(subscription: Subscription): Promise<string | null> {
  const fromCustomData = readCompanyIdFromCustomData(subscription.customData);
  if (fromCustomData) return fromCustomData;

  const snap = await getFirestore()
    .collectionGroup("billing")
    .where("paddleSubscriptionId", "==", subscription.id)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.ref.parent.parent?.id ?? null;
}

export async function syncPaddleSubscriptionToCompany(
  subscription: Subscription,
  eventCreatedAt?: string,
): Promise<string | null> {
  const companyId = await resolveCompanyId(subscription);
  if (!companyId) {
    console.info("[paddle-webhook] no company for subscription", { subscriptionId: subscription.id });
    return null;
  }

  const ref = getFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  const eventAt = paddleEventTimestamp(eventCreatedAt);

  await getFirestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const lastEventAt = snap.data()?.paddleEventAt;
    const lastMs = lastEventAt instanceof Timestamp ? lastEventAt.toMillis() : null;
    const nextMs = eventAt?.toMillis() ?? null;

    if (lastMs !== null && nextMs !== null && nextMs < lastMs) {
      console.info("[paddle-webhook] ignoring stale event", {
        companyId,
        subscriptionId: subscription.id,
      });
      return;
    }

    transaction.set(
      ref,
      {
        ...subscriptionDocFromPaddle(subscription),
        ...(eventAt ? { paddleEventAt: eventAt } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  console.info("[paddle-webhook] subscription synced", {
    companyId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  return companyId;
}

export async function fetchAndSyncPaddleSubscription(
  subscriptionId: string,
  eventCreatedAt?: string,
): Promise<string | null> {
  const paddle = getPaddleInstance();
  const subscription = await paddle.subscriptions.get(subscriptionId);
  return syncPaddleSubscriptionToCompany(subscription, eventCreatedAt);
}

export async function syncPaddleSubscriptionForCompany(
  companyId: string,
  options?: { transactionId?: string },
): Promise<boolean> {
  const ref = getFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  const transactionId = options?.transactionId?.trim() || "";
  if (transactionId) {
    const synced = await syncPaddleSubscriptionFromTransaction(transactionId);
    if (synced) {
      const next = await ref.get();
      return next.data()?.proActive === true;
    }
  }

  const snap = await ref.get();
  const data = snap.data();
  const subscriptionId =
    typeof data?.paddleSubscriptionId === "string" ? data.paddleSubscriptionId.trim() : "";

  if (subscriptionId) {
    await fetchAndSyncPaddleSubscription(subscriptionId);
    const next = await ref.get();
    return next.data()?.proActive === true;
  }

  const discoveredId = await findPaddleSubscriptionIdForCompany(companyId);
  if (!discoveredId) return false;

  await fetchAndSyncPaddleSubscription(discoveredId);
  const next = await ref.get();
  return next.data()?.proActive === true;
}

async function syncPaddleSubscriptionFromTransaction(transactionId: string): Promise<boolean> {
  const paddle = getPaddleInstance();
  const transaction = await paddle.transactions.get(transactionId);
  const subscriptionId = transaction.subscriptionId?.trim();
  if (!subscriptionId) return false;

  const companyId = await syncPaddleSubscriptionToCompany(
    await paddle.subscriptions.get(subscriptionId),
  );
  return Boolean(companyId);
}

async function findPaddleSubscriptionIdForCompany(companyId: string): Promise<string | null> {
  const paddle = getPaddleInstance();
  const collection = paddle.subscriptions.list({
    status: ["active", "trialing", "past_due"],
    perPage: 200,
  });

  for await (const subscription of collection) {
    if (readCompanyIdFromCustomData(subscription.customData) === companyId) {
      return subscription.id;
    }
  }

  return null;
}
