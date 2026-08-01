/**
 * Store error normalization — L1.
 *
 * `react-native-iap` surfaces ~35 `ErrorCode` values. Users need about eight
 * distinct reactions. This collapses one into the other and guarantees no raw
 * SDK string ever reaches a toast.
 */
import { ErrorCode } from 'react-native-iap';

import { MobileApiError } from '@/services/api/mobile-client';

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
  verification_failed: 'We could not verify your purchase. No charge was applied twice — contact support if this persists.',
  bound_to_other_company: 'This Apple subscription is already used by another workspace.',
  permission_denied: 'Only the workspace owner can manage the subscription.',
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

export function failure(code: PurchaseFailureCode, debugMessage?: string): PurchaseFailure {
  return { code, message: MESSAGES[code], debugMessage };
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
    return failure(CODE_MAP[storeCode] ?? 'unknown', debugMessage);
  }

  // Verification is an HTTP round-trip through our own API, not StoreKit.
  if (error instanceof MobileApiError) {
    if (error.status === 409) return failure('bound_to_other_company', debugMessage);
    if (error.status === 403) return failure('permission_denied', debugMessage);
    if (error.status === 402 || error.status === 400) {
      return failure('verification_failed', debugMessage);
    }
    return failure('network', debugMessage);
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
