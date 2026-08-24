import "server-only";

import {
  EventName,
  type EventEntity,
  type Subscription,
  type SubscriptionNotification,
  type TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";

import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";
import {
  fetchAndSyncPaddleSubscription,
  syncPaddleSubscriptionToCompany,
} from "@/lib/paddle/sync-paddle-subscription";

type SubscriptionEvent = {
  data: SubscriptionNotification;
  occurredAt: string;
};

function readCompanyIdFromCustomData(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const companyId = data.companyId ?? data.company_id;
  return typeof companyId === "string" && companyId.trim() ? companyId.trim() : null;
}

async function handleSubscription(event: SubscriptionEvent) {
  // Prefer the verified event payload — avoids failing webhook delivery when
  // Paddle sends a simulation / demo subscription id that cannot be re-fetched.
  if (event.data?.id) {
    const companyId = await syncPaddleSubscriptionToCompany(
      event.data as unknown as Subscription,
      event.occurredAt,
    );
    if (companyId) return;
  }

  if (event.data?.id) {
    try {
      await fetchAndSyncPaddleSubscription(event.data.id, event.occurredAt);
    } catch (error) {
      console.info("[paddle-webhook] subscription fetch skipped", {
        subscriptionId: event.data.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

async function handleTransactionCompleted(event: TransactionCompletedEvent) {
  const transaction = event.data;
  const subscriptionId = transaction.subscriptionId?.trim();
  if (!subscriptionId) return;

  const companyId = readCompanyIdFromCustomData(transaction.customData);
  if (companyId) {
    try {
      const paddle = getPaddleInstance();
      const subscription = await paddle.subscriptions.get(subscriptionId);
      await syncPaddleSubscriptionToCompany(subscription, event.occurredAt);
      return;
    } catch (error) {
      console.info("[paddle-webhook] transaction subscription fetch skipped", {
        subscriptionId,
        error: error instanceof Error ? error.message : error,
      });
      return;
    }
  }

  try {
    await fetchAndSyncPaddleSubscription(subscriptionId, event.occurredAt);
  } catch (error) {
    console.info("[paddle-webhook] transaction subscription sync skipped", {
      subscriptionId,
      error: error instanceof Error ? error.message : error,
    });
  }
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
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      // Customer linkage is derived from subscription custom_data / portal lookup.
      return;
    default:
      return;
  }
}
