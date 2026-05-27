import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { BillingPlan, BillingStatus, CompanySubscription } from "@/domain/billing";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { stripePriceIds } from "@/lib/stripe/prices";

type SubscriptionDoc = {
  plan?: BillingPlan;
  status?: BillingStatus;
  proActive?: boolean;
  provider?: "internal" | "stripe";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: "monthly" | "yearly" | null;
  currentPeriodEnd?: Timestamp;
  stripeUpdatedAt?: Timestamp;
  updatedAt?: Timestamp;
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function billingIntervalFromPriceId(priceId: string | undefined): CompanySubscription["billingInterval"] {
  if (!priceId) return null;
  if (priceId === stripePriceIds.proYearly) return "yearly";
  if (priceId === stripePriceIds.proMonthly) return "monthly";
  return null;
}

function mapSubscription(data: SubscriptionDoc | undefined): CompanySubscription | null {
  if (!data) return null;

  const plan: BillingPlan = data.plan === "pro" ? "pro" : "free";
  const status: BillingStatus =
    data.status &&
    (["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"] as const).includes(data.status)
      ? data.status
      : "active";

  const proActive =
    typeof data.proActive === "boolean"
      ? data.proActive
      : plan === "pro" &&
        (status === "active" || status === "trialing" || status === "past_due");

  return {
    plan,
    status,
    proActive,
    provider: data.provider ?? "internal",
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    priceId: data.priceId,
    billingInterval: data.billingInterval ?? billingIntervalFromPriceId(data.priceId),
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    stripeUpdatedAt: toDate(data.stripeUpdatedAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function companySubscriptionRef(companyId: string) {
  return doc(getFirestoreDb(), "companies", companyId, "billing", "subscription");
}

export async function readCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const snap = await getDoc(companySubscriptionRef(companyId));
  return snap.exists() ? mapSubscription(snap.data() as SubscriptionDoc) : null;
}

export async function seedFreeCompanyBilling(companyId: string): Promise<void> {
  const ref = companySubscriptionRef(companyId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    await setDoc(ref, {
      plan: "free",
      status: "active",
      proActive: false,
      provider: "internal",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      return;
    }
    throw error;
  }
}

export function subscribeCompanySubscription(
  companyId: string,
  onData: (subscription: CompanySubscription | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    companySubscriptionRef(companyId),
    (snap) => onData(snap.exists() ? mapSubscription(snap.data() as SubscriptionDoc) : null),
    (error) => onError?.(error),
  );
}
