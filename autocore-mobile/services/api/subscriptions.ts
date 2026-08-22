/**
 * Subscription API transport — L2a/L2b.
 *
 * Typed wrappers over the existing `mobileFetch` client (Firebase bearer token
 * + `X-Company-Id` header are added there). The server is the only party that
 * may decide entitlement; these calls carry evidence, not conclusions.
 */
import { mobilePost } from '@/services/api/mobile-client';
import type { BillingInterval } from '@/types/billing';

export const subscriptionApi = {
  appleLink: '/api/mobile/billing/apple/link',
  appleVerify: '/api/mobile/billing/apple/verify',
  appleRestore: '/api/mobile/billing/apple/restore',
  appleReconcile: '/api/mobile/billing/apple/reconcile',
  refresh: '/api/billing/refresh',
  activatePro: '/api/billing/activate-pro',
} as const;

/** Server-minted, stable UUID binding a StoreKit transaction to (uid, company). */
export type AppAccountTokenResponse = {
  appAccountToken: string;
};

export function fetchAppAccountToken(companyId: string): Promise<AppAccountTokenResponse> {
  return mobilePost<AppAccountTokenResponse>(subscriptionApi.appleLink, { companyId });
}

export type AppleVerificationRejection =
  | 'signature_invalid'
  | 'bundle_mismatch'
  | 'environment_mismatch'
  | 'token_mismatch'
  | 'bound_to_other_company'
  | 'expired'
  | 'revoked'
  | 'superseded_by_stripe';

export type VerifyApplePurchaseRequest = {
  companyId: string;
  /** StoreKit 2 transaction identifier. */
  transactionId: string;
  /** Signed JWS representation — the server re-verifies it against Apple. */
  jws: string | null;
  productId: string;
  appAccountToken: string | null;
};

export type VerifyApplePurchaseResponse = {
  accepted: boolean;
  reason?: AppleVerificationRejection;
  /** Name of the workspace holding this subscription, on a conflict. */
  conflictCompany?: string | null;
  /** Echo of the entitlement the server wrote, for optimistic UI only. */
  proActive?: boolean;
  planId?: string;
};

export function verifyApplePurchase(
  body: VerifyApplePurchaseRequest,
): Promise<VerifyApplePurchaseResponse> {
  return mobilePost<VerifyApplePurchaseResponse>(subscriptionApi.appleVerify, body);
}

export type RestoreApplePurchasesRequest = {
  companyId: string;
  transactions: Array<{
    transactionId: string;
    jws: string | null;
    productId: string;
  }>;
  /**
   * Move a subscription that is currently attached to another workspace.
   * Never sent implicitly — the user has to confirm the move, because it
   * revokes Pro from the workspace that holds it today.
   */
  transfer?: boolean;
};

export type RestoreApplePurchasesResponse = {
  restored: boolean;
  reason?: AppleVerificationRejection;
  conflictCompany?: string | null;
  transferred?: boolean;
  planId?: string;
  proActive?: boolean;
};

export function restoreApplePurchases(
  body: RestoreApplePurchasesRequest,
): Promise<RestoreApplePurchasesResponse> {
  return mobilePost<RestoreApplePurchasesResponse>(subscriptionApi.appleRestore, body);
}

/**
 * Pull the workspace's Apple subscription state from Apple.
 *
 * The push side (App Store Server Notifications) can be unconfigured, delayed
 * or lost; without a pull the stored document freezes at the last successful
 * write and the app shows a subscription that no longer matches reality.
 */
export function reconcileAppleSubscription(
  companyId: string,
): Promise<{ reconciled: boolean; proActive?: boolean; reason?: string }> {
  return mobilePost(subscriptionApi.appleReconcile, { companyId });
}

/** Force server-side expiry evaluation. Existing endpoint, unchanged. */
export function refreshCompanyBilling(
  companyId: string,
): Promise<{ proActive: boolean; expired?: 'trial' | 'pro' }> {
  return mobilePost(subscriptionApi.refresh, { companyId });
}

/**
 * Grant Pro without payment, for a development or App Store review account.
 *
 * The server decides whether this is allowed: it is off in production unless
 * `ALLOW_INTERNAL_PRO_ACTIVATION` is set, and can be narrowed to named accounts
 * with `INTERNAL_PRO_ALLOWED_EMAILS`. The app only offers the button — it never
 * grants anything itself, so the entitlement stays a server fact that web and
 * mobile both read from the same Firestore document.
 */
export function activateProForever(companyId: string): Promise<{ proActive: boolean }> {
  return mobilePost(subscriptionApi.activatePro, {
    companyId,
    interval: 'yearly',
    lifetime: true,
  });
}

export type { BillingInterval };
