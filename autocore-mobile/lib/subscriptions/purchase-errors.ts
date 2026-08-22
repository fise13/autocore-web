/**
 * Store error normalization — L1.
 *
 * `react-native-iap` surfaces ~35 `ErrorCode` values. Users need about eight
 * distinct reactions. This collapses one into the other and guarantees no raw
 * SDK string ever reaches a toast.
 */
import { ErrorCode } from 'react-native-iap';

import { MobileApiError } from '@/services/api/mobile-client';

import { verificationFailureForStatus } from './api-failure';
import type { PurchaseFailure, PurchaseFailureCode } from './types';

const MESSAGES: Record<PurchaseFailureCode, string> = {
  user_cancelled: 'Purchase cancelled.',
  network: 'No connection to the App Store. Check your network and try again.',
  already_owned: 'You already have an active subscription for this Apple ID.',
  not_available: 'This subscription is not available right now. Please try again later.',
  deferred: 'Your purchase is waiting for approval.',
  store_unavailable: 'In-app purchases are unavailable on this device.',
  not_connected: 'Could not reach the App Store. Please try again.',
  payment_not_allowed: 'Purchases are restricted on this device. Check Screen Time settings.',
  verification_failed:
    'We could not confirm your purchase yet. It will turn on automatically once we reach the App Store.',
  bound_to_other_company: 'This Apple subscription is already used by another workspace.',
  permission_denied: 'Only an owner or admin can manage this workspace subscription.',
  server_unconfigured:
    'Your payment went through, but AutoCore cannot reach the App Store to record it. This is on our side — contact support.',
  sheet_timeout: 'Apple did not open the payment sheet. Try again.',
  unknown: 'Something went wrong with the purchase. Please try again.',
};

const CODE_MAP: Partial<Record<ErrorCode, PurchaseFailureCode>> = {
  [ErrorCode.UserCancelled]: 'user_cancelled',
  [ErrorCode.NetworkError]: 'network',
  [ErrorCode.RemoteError]: 'network',
  [ErrorCode.ServiceTimeout]: 'network',
  [ErrorCode.AlreadyOwned]: 'already_owned',
  [ErrorCode.DuplicatePurchase]: 'already_owned',
  [ErrorCode.ItemUnavailable]: 'not_available',
  [ErrorCode.SkuNotFound]: 'not_available',
  [ErrorCode.QueryProduct]: 'not_available',
  [ErrorCode.DeferredPayment]: 'deferred',
  [ErrorCode.Pending]: 'deferred',
  [ErrorCode.IapNotAvailable]: 'store_unavailable',
  [ErrorCode.BillingUnavailable]: 'store_unavailable',
  [ErrorCode.FeatureNotSupported]: 'store_unavailable',
  [ErrorCode.NotPrepared]: 'not_connected',
  [ErrorCode.InitConnection]: 'not_connected',
  [ErrorCode.ConnectionClosed]: 'not_connected',
  [ErrorCode.ServiceDisconnected]: 'not_connected',
  [ErrorCode.ServiceError]: 'not_connected',
  [ErrorCode.UserError]: 'payment_not_allowed',
  [ErrorCode.TransactionValidationFailed]: 'verification_failed',
  [ErrorCode.PurchaseVerificationFailed]: 'verification_failed',
};

export function failure(
  code: PurchaseFailureCode,
  debugMessage?: string,
  cause?: string,
): PurchaseFailure {
  return { code, message: MESSAGES[code], debugMessage, cause };
}

const CATALOG_NOISE = new Set<string>([ErrorCode.QueryProduct, ErrorCode.SkuNotFound]);

const IN_FLIGHT_GHOST_CODES = new Set<PurchaseFailureCode>([
  'not_available',
  'unknown',
  'network',
  'not_connected',
  'store_unavailable',
]);

/** OpenIAP catalog lookups, not a failed buy. Never a paywall banner. */
export function isCatalogNoise(value: PurchaseFailure): boolean {
  return Boolean(value.cause && CATALOG_NOISE.has(value.cause));
}

/**
 * OpenIAP / StoreKit often emit a failure a beat before `Transaction.updates`
 * delivers the purchase. Painting that makes a successful buy look broken.
 */
export function isInFlightGhostError(value: PurchaseFailure): boolean {
  if (isCatalogNoise(value)) return true;
  return IN_FLIGHT_GHOST_CODES.has(value.code);
}

function readErrorCode(error: unknown): ErrorCode | null {
  if (typeof error !== 'object' || error === null) return null;
  const raw = (error as { code?: unknown }).code;
  if (typeof raw !== 'string') return null;
  const known = Object.values(ErrorCode).find((value) => value === raw);
  return (known as ErrorCode | undefined) ?? null;
}

/** Map anything thrown during a purchase into one presentable failure. */
export function toPurchaseFailure(error: unknown): PurchaseFailure {
  const debugMessage = error instanceof Error ? error.message : String(error);

  const storeCode = readErrorCode(error);
  if (storeCode) {
    return failure(CODE_MAP[storeCode] ?? 'unknown', debugMessage, storeCode);
  }

  // Verification is an HTTP round-trip through our own API, not StoreKit.
  if (error instanceof MobileApiError) {
    return failure(verificationFailureForStatus(error.status), debugMessage);
  }

  return failure('unknown', debugMessage);
}

/** Cancellation is a normal outcome, never an error toast. */
export function isCancellation(failureValue: PurchaseFailure): boolean {
  return failureValue.code === 'user_cancelled';
}

function isPurchaseFailure(value: unknown): value is PurchaseFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as PurchaseFailure).code === 'string'
  );
}

/**
 * Normalize anything caught into a `PurchaseFailure`, passing through values
 * that are already one.
 *
 * Layers below throw both raw SDK errors and already-mapped failures; every
 * catch site needs the same narrowing, so it lives here rather than being
 * re-inlined at each one.
 */
export function asPurchaseFailure(error: unknown): PurchaseFailure {
  return isPurchaseFailure(error) ? error : toPurchaseFailure(error);
}
