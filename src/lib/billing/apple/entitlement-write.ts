/**
 * What a verified transaction does to a workspace's subscription document.
 *
 * Pure: no Firestore, no network. `apple-entitlement.server.ts` is the thin
 * shell that reads the two documents this needs, calls `decideEntitlementWrite`,
 * and commits the result — so the rules that decide who owns a payment can be
 * tested without a database, the same way `transaction-payload.ts` already
 * lets the rules that decide whether a payment counts be tested without Apple.
 */

import { planForAppleProduct } from "./apple-config";
import {
  AppleRejectionError,
  billingStatusFor,
  expiresAt,
  isExpired,
  willAutoRenew,
  type AppleRenewalInfo,
  type AppleTransaction,
} from "./transaction-payload";

export type EntitlementWriteInput = {
  companyId: string;
  transaction: AppleTransaction;
  renewal: AppleRenewalInfo | null;
  /** Company currently holding this `originalTransactionId`, from the index. */
  boundCompanyId: string | null;
  /** `currentPeriodEnd` already stored for `companyId`, in epoch ms. */
  storedPeriodEndMs: number | null;
  /** `appleOriginalTransactionId` already stored for `companyId`. */
  storedOriginalTransactionId: string | null;
  storedProActive: boolean;
  allowTransfer: boolean;
  now: Date;
};

export type EntitlementDocument = {
  plan: "pro" | "free";
  status: string;
  proActive: boolean;
  provider: "apple";
  billingInterval: string | null;
  appleProductId: string | null;
  appleOriginalTransactionId: string | null;
  appleTransactionId: string | null;
  appleEnvironment: string | null;
  willAutoRenew: boolean;
  trialUsed: true;
  currentPeriodEnd: Date | null;
  revoked: boolean;
};

export type EntitlementWriteDecision =
  /** Nothing to write; the stored term already covers a later date. */
  | { kind: "skip_stale"; proActive: boolean; planId: string | null; status: string }
  | {
      kind: "write";
      /** Company to revoke, when this call moves the subscription. */
      transferFrom: string | null;
      document: EntitlementDocument;
      planId: string | null;
    };

/**
 * Decide what a transaction means for a workspace.
 *
 * Two rules carry the weight here, and both exist because of a specific way
 * entitlement used to go wrong:
 *
 *  - **Ownership.** An `originalTransactionId` already bound to another company
 *    is refused unless the caller asked for a transfer. Silently re-pointing the
 *    index left the previous workspace marked Pro off a subscription it no
 *    longer held, so one payment entitled two companies.
 *
 *  - **Ordering.** Apple does not deliver notifications in order, and the app
 *    replays its transaction queue on every launch. An older transaction for the
 *    same subscription would otherwise shorten `currentPeriodEnd` and expire a
 *    live term. Revocations are exempt: a refund is immediate whatever the dates
 *    say.
 */
export function decideEntitlementWrite(
  input: EntitlementWriteInput,
): EntitlementWriteDecision {
  const { companyId, transaction, renewal, boundCompanyId, now } = input;

  const isTransfer = Boolean(boundCompanyId && boundCompanyId !== companyId);
  if (isTransfer && !input.allowTransfer) {
    throw new AppleRejectionError(
      "bound_to_other_company",
      `Original transaction ${transaction.originalTransactionId} belongs to ${boundCompanyId}`,
    );
  }

  const plan = planForAppleProduct(transaction.productId);
  const status = billingStatusFor(transaction, renewal, now);
  const revoked = Boolean(transaction.revocationDate);
  const proActive = !revoked && !isExpired(transaction, now);
  const periodEnd = expiresAt(transaction);
  const originalTransactionId = transaction.originalTransactionId ?? null;

  const sameSubscription =
    Boolean(originalTransactionId) &&
    input.storedOriginalTransactionId === originalTransactionId;
  const incomingEnd = periodEnd ? periodEnd.getTime() : null;

  if (
    !revoked &&
    sameSubscription &&
    input.storedPeriodEndMs !== null &&
    incomingEnd !== null &&
    incomingEnd < input.storedPeriodEndMs
  ) {
    return {
      kind: "skip_stale",
      proActive: input.storedProActive,
      planId: plan?.planId ?? null,
      status,
    };
  }

  return {
    kind: "write",
    transferFrom: isTransfer ? boundCompanyId : null,
    planId: plan?.planId ?? null,
    document: {
      plan: proActive ? "pro" : "free",
      status,
      proActive,
      provider: "apple",
      billingInterval: plan?.interval ?? null,
      appleProductId: transaction.productId ?? null,
      appleOriginalTransactionId: originalTransactionId,
      appleTransactionId: transaction.transactionId ?? null,
      appleEnvironment: transaction.environment ?? null,
      willAutoRenew: willAutoRenew(renewal),
      // Blocks the legacy web start-trial API. Apple introductory-offer state
      // is `offerType` + `expiresDate` on the transaction, not this flag.
      trialUsed: true,
      currentPeriodEnd: periodEnd,
      revoked,
    },
  };
}
