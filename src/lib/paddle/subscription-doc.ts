import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Subscription, SubscriptionStatus } from "@paddle/paddle-node-sdk";

import { billingIntervalFromPaddlePriceId } from "@/lib/paddle/prices";

const PRO_STATUSES = new Set<SubscriptionStatus>(["active", "trialing", "past_due"]);

function readCustomData(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const out: Record<string, string> = {};
  for (const [key, raw] of entries) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

function readPeriodEnd(subscription: Subscription): Date | null {
  const nextBilledAt = subscription.nextBilledAt?.trim();
  if (nextBilledAt) {
    const parsed = Date.parse(nextBilledAt);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  const scheduledAt = subscription.scheduledChange?.effectiveAt?.trim();
  if (scheduledAt) {
    const parsed = Date.parse(scheduledAt);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  return null;
}

export function isProPaddleStatus(status: SubscriptionStatus | undefined): boolean {
  return Boolean(status && PRO_STATUSES.has(status));
}

export function subscriptionDocFromPaddle(subscription: Subscription) {
  const priceId = subscription.items?.[0]?.price?.id ?? null;
  const status = subscription.status ?? "canceled";
  const proActive = isProPaddleStatus(status);
  const periodEnd = readPeriodEnd(subscription);
  const customData = readCustomData(subscription.customData);

  return {
    plan: proActive ? ("pro" as const) : ("free" as const),
    status,
    proActive,
    provider: "paddle" as const,
    paddleCustomerId: subscription.customerId ?? null,
    paddleSubscriptionId: subscription.id,
    priceId,
    billingInterval: billingIntervalFromPaddlePriceId(priceId),
    currentPeriodEnd: periodEnd ? Timestamp.fromDate(periodEnd) : null,
    paddleUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    paddleCustomData: Object.keys(customData).length > 0 ? customData : null,
  };
}

export function paddleEventTimestamp(eventCreatedAt: string | undefined): Timestamp | null {
  if (!eventCreatedAt?.trim()) return null;
  const parsed = Date.parse(eventCreatedAt);
  if (Number.isNaN(parsed)) return null;
  return Timestamp.fromMillis(parsed);
}
