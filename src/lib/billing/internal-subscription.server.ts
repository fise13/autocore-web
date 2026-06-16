import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { BillingInterval } from "@/domain/billing";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";

export const TRIAL_DAYS = 14;

const INTERNAL_PRO_DAYS: Record<BillingInterval, number> = {
  monthly: 30,
  yearly: 365,
};

type SubscriptionDoc = {
  plan?: string;
  status?: string;
  proActive?: boolean;
  provider?: string;
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: Timestamp;
  trialUsed?: boolean;
  trialStartedAt?: Timestamp;
};

export type RefreshSubscriptionResult = {
  proActive: boolean;
  expired?: "trial" | "pro";
  status?: string;
};

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

function periodEndTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function readPeriodEnd(data: SubscriptionDoc | undefined): Date | null {
  const value = data?.currentPeriodEnd;
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

function isInternallyManaged(data: SubscriptionDoc | undefined): boolean {
  return data?.provider !== "stripe";
}

export async function refreshInternalSubscription(companyId: string): Promise<RefreshSubscriptionResult> {
  if (companyId === DEMO_COMPANY_ID) {
    return { proActive: true, status: "trialing" };
  }

  const ref = getAdminFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  const snap = await ref.get();
  if (!snap.exists) {
    return { proActive: false, status: "active" };
  }

  const data = snap.data() as SubscriptionDoc;
  const proActive = Boolean(data.proActive);
  const status = data.status ?? "active";

  if (!proActive || !isInternallyManaged(data)) {
    return { proActive, status };
  }

  const periodEnd = readPeriodEnd(data);
  if (!periodEnd || periodEnd.getTime() > Date.now()) {
    return { proActive: true, status };
  }

  const expiredKind = status === "trialing" ? "trial" : "pro";

  await ref.set(
    {
      plan: "free",
      status: "active",
      proActive: false,
      expiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { proActive: false, expired: expiredKind, status: "active" };
}

export async function startInternalTrial(companyId: string, uid: string): Promise<{ proActive: boolean; started: boolean }> {
  if (companyId === DEMO_COMPANY_ID) {
    return { proActive: true, started: false };
  }

  await verifyCompanyOwner(uid, companyId);

  const ref = getAdminFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  const snap = await ref.get();
  const data = (snap.data() as SubscriptionDoc | undefined) ?? {};

  if (data.provider === "stripe" && data.proActive) {
    return { proActive: true, started: false };
  }

  const periodEnd = readPeriodEnd(data);
  if (data.proActive && periodEnd && periodEnd.getTime() > Date.now()) {
    return { proActive: true, started: false };
  }

  if (data.trialUsed) {
    return { proActive: false, started: false };
  }

  const now = new Date();
  const trialEnd = addDays(now, TRIAL_DAYS);

  await ref.set(
    {
      plan: "pro",
      status: "trialing",
      proActive: true,
      provider: "internal",
      trialUsed: true,
      trialStartedAt: FieldValue.serverTimestamp(),
      currentPeriodEnd: periodEndTimestamp(trialEnd),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { proActive: true, started: true };
}

export async function activateInternalPro(
  companyId: string,
  uid: string,
  interval: BillingInterval,
): Promise<{ proActive: boolean }> {
  if (companyId === DEMO_COMPANY_ID) {
    return { proActive: true };
  }

  await verifyCompanyOwner(uid, companyId);

  const ref = getAdminFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");

  const snap = await ref.get();
  const data = (snap.data() as SubscriptionDoc | undefined) ?? {};

  if (data.provider === "stripe" && data.proActive) {
    return { proActive: true };
  }

  const now = new Date();
  const periodEnd = addDays(now, INTERNAL_PRO_DAYS[interval]);

  await ref.set(
    {
      plan: "pro",
      status: "active",
      proActive: true,
      provider: "internal",
      billingInterval: interval,
      trialUsed: true,
      currentPeriodEnd: periodEndTimestamp(periodEnd),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { proActive: true };
}
