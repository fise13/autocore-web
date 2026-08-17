import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";

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

/**
 * Writes the entitlement Apple purchases produce.
 *
 * The document is the same one Stripe and the internal trial write —
 * `companies/{companyId}/billing/subscription` — so web, mobile and desktop all
 * keep reading one fact through `@autocore/billing`. Only `provider` says who
 * last owned it.
 */

const APPLE_LINKS = "appleTransactionLinks";

function subscriptionRef(companyId: string) {
  return getAdminFirestore()
    .collection("companies")
    .doc(companyId)
    .collection("billing")
    .doc("subscription");
}

/**
 * Maps an Apple `originalTransactionId` to the company that owns it.
 *
 * App Store Server Notifications arrive with no session and no company — this
 * index is the only way a renewal, cancellation or refund can find the
 * workspace it belongs to.
 */
function linkRef(originalTransactionId: string) {
  return getAdminFirestore().collection(APPLE_LINKS).doc(originalTransactionId);
}

export type StoredSubscription = {
  provider?: string;
  proActive?: boolean;
  appleAppAccountToken?: string;
  appleOriginalTransactionId?: string;
};

/**
 * Stable UUID binding StoreKit purchases to (company, buyer).
 *
 * The app passes it as `appAccountToken` at purchase time and Apple echoes it
 * back inside the signed transaction, which is what lets the server prove a
 * given payment belongs to this workspace rather than to whoever replayed it.
 * Minted once and reused — regenerating it would orphan existing subscriptions.
 */
export async function ensureAppAccountToken(companyId: string, uid: string): Promise<string> {
  await verifyCompanyOwner(uid, companyId);

  const ref = subscriptionRef(companyId);
  const snap = await ref.get();
  const existing = (snap.data() as StoredSubscription | undefined)?.appleAppAccountToken;
  if (existing) return existing;

  const token = randomUUID();
  await ref.set(
    { appleAppAccountToken: token, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return token;
}

export async function readStoredSubscription(companyId: string): Promise<StoredSubscription> {
  const snap = await subscriptionRef(companyId).get();
  return (snap.data() as StoredSubscription | undefined) ?? {};
}

/**
 * A workspace already paying through Stripe must not be charged again by Apple.
 * Checked before the purchase is honoured so the app can show "managed
 * elsewhere" instead of silently double-billing.
 */
export function assertNotStripeManaged(stored: StoredSubscription): void {
  if (stored.provider === "stripe" && stored.proActive) {
    throw new AppleRejectionError("superseded_by_stripe");
  }
}

/** Company a notification's transaction belongs to, or null if we never saw it. */
export async function companyForOriginalTransaction(
  originalTransactionId: string,
): Promise<string | null> {
  const snap = await linkRef(originalTransactionId).get();
  const companyId = (snap.data() as { companyId?: string } | undefined)?.companyId;
  return companyId?.trim() || null;
}

export type ApplyResult = {
  proActive: boolean;
  planId: string | null;
  status: string;
};

/**
 * Write the entitlement implied by a verified transaction.
 *
 * Idempotent by construction: the same transaction applied twice produces the
 * same document, which matters because StoreKit replays transactions on every
 * launch and Apple retries notifications for up to three days.
 */
export async function applyAppleTransaction(options: {
  companyId: string;
  transaction: AppleTransaction;
  renewal: AppleRenewalInfo | null;
  now?: Date;
}): Promise<ApplyResult> {
  const now = options.now ?? new Date();
  const { companyId, transaction, renewal } = options;

  const plan = planForAppleProduct(transaction.productId);
  const status = billingStatusFor(transaction, renewal, now);
  const revoked = Boolean(transaction.revocationDate);
  const proActive = !revoked && !isExpired(transaction, now);
  const periodEnd = expiresAt(transaction);

  await subscriptionRef(companyId).set(
    {
      plan: proActive ? "pro" : "free",
      status,
      proActive,
      provider: "apple",
      billingInterval: plan?.interval ?? null,
      appleProductId: transaction.productId ?? null,
      appleOriginalTransactionId: transaction.originalTransactionId ?? null,
      appleTransactionId: transaction.transactionId ?? null,
      appleEnvironment: transaction.environment ?? null,
      willAutoRenew: willAutoRenew(renewal),
      // Buying Pro consumes the internal trial: a company should not get 14 more
      // free days by cancelling Apple and asking for the in-app trial instead.
      trialUsed: true,
      ...(periodEnd ? { currentPeriodEnd: Timestamp.fromDate(periodEnd) } : {}),
      ...(revoked ? { revokedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (transaction.originalTransactionId) {
    await linkRef(transaction.originalTransactionId).set(
      {
        companyId,
        productId: transaction.productId ?? null,
        environment: transaction.environment ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return { proActive, planId: plan?.planId ?? null, status };
}
