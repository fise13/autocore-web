/**
 * Subscription domain types — L0.
 *
 * These are the app-facing shapes. Nothing here imports `react-native-iap`, so
 * every layer above L1 stays testable without the native module.
 */
import type { BillingStatus } from '@/types/billing';

export const SUBSCRIPTION_TIERS = ['free', 'pro', 'enterprise'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const PLAN_IDS = ['free', 'pro_monthly', 'pro_yearly', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type BillingInterval = 'monthly' | 'yearly';

export type EntitlementProvider = 'internal' | 'stripe' | 'apple' | 'google';

/**
 * Where the resolved entitlement came from. Ordered by trust — the resolver
 * always prefers the earliest available source.
 */
export type EntitlementSource =
  /** Simulated by the development panel. `__DEV__` only, always labelled. */
  | 'dev'
  /** Live Firestore snapshot — the server decided this. */
  | 'authoritative'
  /** MMKV cache, still inside its TTL. Offline or listener not yet warm. */
  | 'cached'
  /** StoreKit says this device holds an active subscription, unverified by us. */
  | 'local_unverified'
  /** Nothing available — treated as free. */
  | 'unknown';

export type Entitlement = {
  companyId: string | null;
  tier: SubscriptionTier;
  planId: PlanId;
  status: BillingStatus;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  /** The company has already used its one internal trial. */
  trialUsed: boolean;
  renewsAt: Date | null;
  willAutoRenew: boolean;
  inGracePeriod: boolean;
  provider: EntitlementProvider;
  /**
   * True when the subscription is managed outside the App Store (Stripe on web,
   * or an Enterprise contract). Purchase CTAs must be hidden — buying again
   * would double-bill the company.
   */
  managedExternally: boolean;
  source: EntitlementSource;
};

/** Normalized store product. UI never sees a raw `ProductSubscriptionIOS`. */
export type StoreProduct = {
  planId: PlanId;
  sku: string;
  /** Localized, store-formatted price — e.g. "€24,99". Never construct this. */
  displayPrice: string;
  /** Numeric amount in `currency`, for computing yearly savings only. */
  priceAmount: number | null;
  currency: string;
  title: string;
  description: string;
  interval: BillingInterval | null;
  /** Introductory offer (free trial / discounted period) if the user is eligible. */
  introOffer: IntroOffer | null;
};

export type IntroOffer = {
  /** Localized price of the offer period — "Free" for a free trial. */
  displayPrice: string;
  /** e.g. 7 */
  periodCount: number;
  /** e.g. 'day' */
  periodUnit: 'day' | 'week' | 'month' | 'year';
  isFreeTrial: boolean;
};

/** Closed union so every failure has one deliberate presentation. */
export type PurchaseFailureCode =
  | 'user_cancelled'
  | 'network'
  | 'already_owned'
  | 'not_available'
  | 'deferred'
  | 'store_unavailable'
  | 'not_connected'
  | 'payment_not_allowed'
  | 'verification_failed'
  | 'bound_to_other_company'
  | 'permission_denied'
  | 'unknown';

export type PurchaseFailure = {
  code: PurchaseFailureCode;
  /** User-presentable, non-technical. Never a raw SDK string. */
  message: string;
  /** Raw SDK detail, for logs only. */
  debugMessage?: string;
};

/** Purchase flow state machine, consumed directly by the paywall. */
export type PurchaseFlowState =
  | { phase: 'idle' }
  | { phase: 'loading'; planId: PlanId }
  | { phase: 'verifying'; planId: PlanId }
  | { phase: 'pending'; planId: PlanId }
  | { phase: 'success'; planId: PlanId }
  | { phase: 'cancelled' }
  | { phase: 'failed'; failure: PurchaseFailure }
  | { phase: 'already_purchased' }
  | { phase: 'restoring' }
  | { phase: 'restored'; planId: PlanId }
  | { phase: 'restore_empty' }
  | { phase: 'expired' };

export type RestoreOutcome =
  | { kind: 'restored'; planId: PlanId }
  | { kind: 'empty' }
  | { kind: 'expired' }
  | { kind: 'conflict'; message: string }
  | { kind: 'failed'; failure: PurchaseFailure };

/** Why a gated feature was denied. Each maps to a different UI, never one wall. */
export type GateDenialReason = 'entitlement_required' | 'permission_denied' | 'module_disabled';

export type GateResult = {
  allowed: boolean;
  reason: GateDenialReason | null;
  requiredTier: SubscriptionTier;
};
