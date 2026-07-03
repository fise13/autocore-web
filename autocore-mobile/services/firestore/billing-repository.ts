import { doc, getDoc, onSnapshot, type Timestamp } from 'firebase/firestore';

import { getFirebaseDb } from '@/services/firebase';
import type { BillingPlan, BillingStatus, CompanySubscription } from '@/types/billing';

type SubscriptionDoc = {
  plan?: BillingPlan;
  status?: BillingStatus;
  proActive?: boolean;
  provider?: 'internal' | 'stripe';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: 'monthly' | 'yearly' | null;
  currentPeriodEnd?: Timestamp | Date;
  stripeUpdatedAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
};

function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

function mapSubscription(data: SubscriptionDoc | undefined): CompanySubscription | null {
  if (!data) return null;

  const plan: BillingPlan = data.plan === 'pro' ? 'pro' : 'free';
  const status: BillingStatus =
    data.status &&
    (['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'] as const).includes(data.status)
      ? data.status
      : 'active';

  const proActive =
    typeof data.proActive === 'boolean'
      ? data.proActive
      : plan === 'pro' && (status === 'active' || status === 'trialing' || status === 'past_due');

  return {
    plan,
    status,
    proActive,
    provider: data.provider ?? 'internal',
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    priceId: data.priceId,
    billingInterval: data.billingInterval ?? null,
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    stripeUpdatedAt: toDate(data.stripeUpdatedAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function companySubscriptionRef(companyId: string) {
  return doc(getFirebaseDb(), 'companies', companyId, 'billing', 'subscription');
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

export async function readCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const snap = await getDoc(companySubscriptionRef(companyId));
  return snap.exists() ? mapSubscription(snap.data() as SubscriptionDoc) : null;
}
