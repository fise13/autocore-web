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
  refresh: '/api/billing/refresh',
  startTrial: '/api/billing/start-trial',
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
};

export type RestoreApplePurchasesResponse = {
  restored: boolean;
  reason?: AppleVerificationRejection;
  planId?: string;
  proActive?: boolean;
};

export function restoreApplePurchases(
  body: RestoreApplePurchasesRequest,
): Promise<RestoreApplePurchasesResponse> {
  return mobilePost<RestoreApplePurchasesResponse>(subscriptionApi.appleRestore, body);
}

/** Force server-side expiry evaluation. Existing endpoint, unchanged. */
export function refreshCompanyBilling(
  companyId: string,
): Promise<{ proActive: boolean; expired?: 'trial' | 'pro' }> {
  return mobilePost(subscriptionApi.refresh, { companyId });
}

/** Internal (non-Apple) 14-day trial. Existing endpoint, unchanged. */
export function startCompanyTrial(
  companyId: string,
): Promise<{ proActive: boolean; started: boolean }> {
  return mobilePost(subscriptionApi.startTrial, { companyId });
}

export type { BillingInterval };
