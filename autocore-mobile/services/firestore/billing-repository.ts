import { doc, getDoc, onSnapshot, type Timestamp } from 'firebase/firestore';

import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { getFirebaseDb } from '@/services/firebase';
import {
  normalizeBillingPlan,
  normalizeBillingProvider,
  normalizeBillingStatus,
  type CompanySubscription,
} from '@/types/billing';

type SubscriptionDoc = {
  plan?: unknown;
  status?: unknown;
  proActive?: boolean;
  provider?: unknown;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: 'monthly' | 'yearly' | null;
  currentPeriodEnd?: Timestamp | Date;
  stripeUpdatedAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleEnvironment?: 'Sandbox' | 'Production' | null;
  willAutoRenew?: boolean | null;
  trialUsed?: boolean;
  gracePeriodEnd?: Timestamp | Date;
  revokedAt?: Timestamp | Date;
};

function toDate(value: unknown): Date | null {
  return toDateFromFirestore(value) ?? (value instanceof Date ? value : null);
}

function mapSubscription(data: SubscriptionDoc | undefined): CompanySubscription | null {
  if (!data) return null;

  const plan = normalizeBillingPlan(data.plan);
  const status = normalizeBillingStatus(data.status);

  const proActive =
    typeof data.proActive === 'boolean'
      ? data.proActive
      : plan !== 'free' && (status === 'active' || status === 'trialing' || status === 'past_due');

  return {
    plan,
    status,
    proActive,
    provider: normalizeBillingProvider(data.provider),
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    priceId: data.priceId,
    billingInterval: data.billingInterval ?? null,
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    stripeUpdatedAt: toDate(data.stripeUpdatedAt),
    updatedAt: toDate(data.updatedAt),
    appleOriginalTransactionId: data.appleOriginalTransactionId ?? null,
    appleProductId: data.appleProductId ?? null,
    appleEnvironment: data.appleEnvironment ?? null,
    willAutoRenew: data.willAutoRenew ?? null,
    trialUsed: data.trialUsed === true,
    gracePeriodEnd: toDate(data.gracePeriodEnd),
    revokedAt: toDate(data.revokedAt),
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
