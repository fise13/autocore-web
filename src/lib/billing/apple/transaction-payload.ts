/**
 * StoreKit 2 payload shapes and the rules read off them.
 *
 * Pure: no Firestore, no network, no `server-only`. Everything that decides
 * whether a transaction entitles a company lives here so it can be tested
 * without Apple or a database.
 */

import { MOBILE_IOS_BUNDLE_ID } from "@/lib/mobile/universal-links";

export type AppleEnvironment = "Sandbox" | "Production";

/** The subset of `JWSTransactionDecodedPayload` this app depends on. */
export type AppleTransaction = {
  transactionId?: string;
  originalTransactionId?: string;
  webOrderLineItemId?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  originalPurchaseDate?: number;
  expiresDate?: number;
  type?: string;
  inAppOwnershipType?: string;
  environment?: string;
  appAccountToken?: string;
  revocationDate?: number;
  revocationReason?: number;
  offerType?: number;
  storefront?: string;
};

/** The subset of `JWSRenewalInfoDecodedPayload` this app depends on. */
export type AppleRenewalInfo = {
  originalTransactionId?: string;
  autoRenewProductId?: string;
  autoRenewStatus?: number;
  expirationIntent?: number;
  gracePeriodExpiresDate?: number;
  isInBillingRetryPeriod?: boolean;
  environment?: string;
};

export type AppleNotificationPayload = {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  data?: {
    bundleId?: string;
    environment?: string;
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
};

/** Matches `AppleVerificationRejection` in the mobile client, value for value. */
export type AppleRejection =
  | "signature_invalid"
  | "bundle_mismatch"
  | "environment_mismatch"
  | "token_mismatch"
  | "bound_to_other_company"
  | "expired"
  | "revoked"
  | "superseded_by_stripe";

export class AppleRejectionError extends Error {
  reason: AppleRejection;

  constructor(reason: AppleRejection, message?: string) {
    super(message ?? reason);
    this.name = "AppleRejectionError";
    this.reason = reason;
  }
}

export function normalizeEnvironment(value: unknown): AppleEnvironment | null {
  if (value === "Sandbox" || value === "Production") return value;
  return null;
}

/**
 * Which environments this deployment accepts.
 *
 * Production accepts Sandbox too, because that is the only way TestFlight
 * works: TestFlight builds transact against Sandbox while pointing at the
 * production server. Refusing Sandbox here would mean no internal tester could
 * ever complete a purchase. Set `APPLE_STRICT_PRODUCTION_ONLY=true` after
 * launch if you want the tighter rule.
 */
export function acceptedEnvironments(options: {
  nodeEnv: string | undefined;
  strictProductionOnly: boolean;
}): AppleEnvironment[] {
  if (options.nodeEnv !== "production") return ["Sandbox", "Production"];
  return options.strictProductionOnly ? ["Production"] : ["Sandbox", "Production"];
}

export type TransactionCheckInput = {
  transaction: AppleTransaction;
  expectedBundleId?: string;
  expectedAppAccountToken: string | null;
  acceptedEnvironments: AppleEnvironment[];
  knownProductIds: readonly string[];
  now: Date;
};

/**
 * Everything that must hold before a transaction may grant Pro.
 *
 * Order matters: identity of the app first, then who it belongs to, then
 * whether it is still alive. A revoked transaction is rejected even if it has
 * not yet expired — a refund revokes immediately.
 */
export function assertTransactionUsable(input: TransactionCheckInput): void {
  const { transaction, now } = input;

  const bundleId = input.expectedBundleId ?? MOBILE_IOS_BUNDLE_ID;
  if (transaction.bundleId !== bundleId) {
    throw new AppleRejectionError("bundle_mismatch", `Unexpected bundle ${transaction.bundleId}`);
  }

  const environment = normalizeEnvironment(transaction.environment);
  if (!environment || !input.acceptedEnvironments.includes(environment)) {
    throw new AppleRejectionError(
      "environment_mismatch",
      `Environment ${transaction.environment} is not accepted here`,
    );
  }

  if (!transaction.productId || !input.knownProductIds.includes(transaction.productId)) {
    throw new AppleRejectionError(
      "signature_invalid",
      `Unknown product ${transaction.productId ?? "(none)"}`,
    );
  }

  // Family Sharing hands a second Apple ID the same subscription. A shop's
  // workspace is not a family plan, so only the buyer's own copy entitles.
  if (transaction.inAppOwnershipType && transaction.inAppOwnershipType !== "PURCHASED") {
    throw new AppleRejectionError(
      "token_mismatch",
      `Ownership type ${transaction.inAppOwnershipType} is not entitled`,
    );
  }

  if (input.expectedAppAccountToken) {
    const presented = transaction.appAccountToken?.toLowerCase() ?? null;
    if (presented !== input.expectedAppAccountToken.toLowerCase()) {
      throw new AppleRejectionError(
        "token_mismatch",
        "Transaction is not bound to this workspace",
      );
    }
  }

  if (transaction.revocationDate) {
    throw new AppleRejectionError("revoked", "Transaction was refunded or revoked");
  }

  if (isExpired(transaction, now)) {
    throw new AppleRejectionError("expired", "Subscription period has already ended");
  }
}

export function isExpired(transaction: AppleTransaction, now: Date): boolean {
  if (!transaction.expiresDate) return false;
  return transaction.expiresDate <= now.getTime();
}

export function expiresAt(transaction: AppleTransaction): Date | null {
  return transaction.expiresDate ? new Date(transaction.expiresDate) : null;
}

/**
 * Apple's `autoRenewStatus`: 1 = will renew, 0 = turned off. Absent renewal
 * info means we simply do not know, and "will renew" is the safer assumption —
 * it does not grant anything, it only changes what the UI says.
 */
export function willAutoRenew(renewal: AppleRenewalInfo | null): boolean {
  if (!renewal || renewal.autoRenewStatus === undefined) return true;
  return renewal.autoRenewStatus === 1;
}

export function isInBillingRetry(renewal: AppleRenewalInfo | null): boolean {
  return Boolean(renewal?.isInBillingRetryPeriod);
}

/**
 * The billing status to write for a live Apple subscription.
 *
 * `past_due` mirrors what `@autocore/billing` already treats as still-Pro: the
 * card failed but Apple has not given up retrying, and locking a shop out over
 * a retryable payment is worse than a few days of unpaid access.
 */
export function billingStatusFor(
  transaction: AppleTransaction,
  renewal: AppleRenewalInfo | null,
  now: Date,
): "active" | "trialing" | "past_due" | "canceled" {
  if (transaction.revocationDate) return "canceled";
  if (isExpired(transaction, now)) {
    const grace = renewal?.gracePeriodExpiresDate;
    if (grace && grace > now.getTime()) return "past_due";
    if (isInBillingRetry(renewal)) return "past_due";
    return "canceled";
  }
  // offerType 1 is an introductory offer, which is how a StoreKit free trial
  // arrives. Anything else on a live period is a normal paid term.
  if (transaction.offerType === 1) return "trialing";
  return "active";
}

/** Notification types that end an entitlement outright, regardless of dates. */
const TERMINAL_NOTIFICATIONS = new Set(["REFUND", "REVOKE"]);

export function isTerminalNotification(notificationType: string | undefined): boolean {
  return Boolean(notificationType && TERMINAL_NOTIFICATIONS.has(notificationType));
}

/**
 * Notification types that carry no entitlement change worth a write.
 * Everything else is re-evaluated from the transaction it carries.
 */
const IGNORED_NOTIFICATIONS = new Set([
  "CONSUMPTION_REQUEST",
  "RENEWAL_EXTENDED",
  "TEST",
]);

export function isIgnorableNotification(notificationType: string | undefined): boolean {
  return Boolean(notificationType && IGNORED_NOTIFICATIONS.has(notificationType));
}
