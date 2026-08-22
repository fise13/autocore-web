import "server-only";

import {
  EventName,
  type EventEntity,
  type TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";

import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";
import {
  fetchAndSyncPaddleSubscription,
  syncPaddleSubscriptionToCompany,
} from "@/lib/paddle/sync-paddle-subscription";

type SubscriptionEvent = {
  data: { id: string };
  occurredAt: string;
};

function readCompanyIdFromCustomData(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const companyId = data.companyId ?? data.company_id;
  return typeof companyId === "string" && companyId.trim() ? companyId.trim() : null;
}

async function handleSubscription(event: SubscriptionEvent) {
  await fetchAndSyncPaddleSubscription(event.data.id, event.occurredAt);
}

async function handleTransactionCompleted(event: TransactionCompletedEvent) {
  const transaction = event.data;
  const subscriptionId = transaction.subscriptionId?.trim();
  if (!subscriptionId) return;

  const companyId = readCompanyIdFromCustomData(transaction.customData);
  if (companyId) {
    const paddle = getPaddleInstance();
    const subscription = await paddle.subscriptions.get(subscriptionId);
    await syncPaddleSubscriptionToCompany(subscription, event.occurredAt);
    return;
  }

  await fetchAndSyncPaddleSubscription(subscriptionId, event.occurredAt);
}

export async function processPaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return handleSubscription(event);
    case EventName.TransactionCompleted:
      return handleTransactionCompleted(event);
    default:
      return;
  }
}
