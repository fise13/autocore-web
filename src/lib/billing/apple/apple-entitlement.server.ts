import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { verifyCompanyBillingManager } from "@/lib/auth/verify-company-manager.server";

import { decideEntitlementWrite } from "./entitlement-write";
import {
  AppleRejectionError,
  type AppleRenewalInfo,
  type AppleTransaction,
} from "./transaction-payload";

/**
 * Writes the entitlement Apple purchases produce.
 *
 * Period end and trial vs paid come from the verified StoreKit 2 transaction
 * (`expiresDate`, `offerType`) and later App Store Server Notifications — this
 * module never invents a trial timer or charges the customer.
 *
 * The document is the same one Stripe and the legacy web trial write —
 * `companies/{companyId}/billing/subscription` — so web, mobile and desktop all
 * keep reading one fact through `@autocore/billing`. Only `provider` says who
 * last owned it.
 *
 * Every write goes through a Firestore transaction that also owns the
 * `appleTransactionLinks` index. That index is what makes a payment belong to a
 * workspace: without holding both in one transaction, two devices restoring the
 * same Apple ID into two different companies could each believe they won, and
 * both documents would end up Pro off one subscription.
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
  currentPeriodEnd?: Timestamp;
};

type LinkDoc = {
  companyId?: string;
  boundByUid?: string;
  productId?: string | null;
  environment?: string | null;
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
  await verifyCompanyBillingManager(uid, companyId);

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
  const companyId = (snap.data() as LinkDoc | undefined)?.companyId;
  return companyId?.trim() || null;
}

/**
 * Company that minted an `appAccountToken`.
 *
 * The link index only exists after a device has successfully verified a
 * purchase, which made that one round-trip the only way a subscription could
 * ever be recorded: if the phone could not reach `/verify` — no signal, app
 * killed, or the server missing its App Store credentials — Apple's own
 * `SUBSCRIBED` notification arrived, found no link, and was discarded as an
 * unknown transaction. The payment existed at Apple and nowhere else.
 *
 * The token is minted by us, stored on the subscription document before the
 * purchase, and echoed back by Apple inside the signed transaction, so it
 * identifies the workspace just as well as the link does — and it is available
 * on the very first notification. That makes the device round-trip an
 * optimisation rather than the only path.
 */
export async function companyForAppAccountToken(
  appAccountToken: string | null | undefined,
): Promise<string | null> {
  const token = appAccountToken?.trim();
  if (!token) return null;

  // Apple has not always echoed the token in the case it was sent in, and a
  // Firestore equality match is case-sensitive.
  const candidates = [token, token.toLowerCase()].filter(
    (value, index, all) => all.indexOf(value) === index,
  );

  for (const candidate of candidates) {
    let found;
    try {
      found = await getAdminFirestore()
        .collectionGroup("billing")
        .where("appleAppAccountToken", "==", candidate)
        .limit(2)
        .get();
    } catch (error) {
      // Almost always the collection-group index missing from the deployment.
      // Degrading to "unknown" keeps the notification handler answering 200
      // instead of throwing a 500 that makes Apple retry the same doomed
      // lookup for three days.
      console.error(
        "[billing/apple] appAccountToken lookup failed — is the collection-group " +
          "index for billing.appleAppAccountToken deployed?",
        error instanceof Error ? error.message : error,
      );
      return null;
    }

    // Exactly one workspace may claim a token. Two means the index is corrupt,
    // and guessing which owns the payment is worse than recording none.
    if (found.size === 1) {
      const companyId = found.docs[0]!.ref.parent.parent?.id;
      if (companyId) return companyId;
    }
    if (found.size > 1) {
      console.error(
        "[billing/apple] appAccountToken claimed by more than one workspace",
        found.docs.map((doc) => doc.ref.parent.parent?.id),
      );
      return null;
    }
  }

  return null;
}

/** Display name of a workspace, for "already used by …" copy. Never throws. */
export async function companyDisplayName(companyId: string): Promise<string | null> {
  try {
    const snap = await getAdminFirestore().collection("companies").doc(companyId).get();
    const name = (snap.data() as { name?: unknown } | undefined)?.name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Whether a workspace holds no business data yet — nothing in stock, no
 * engines, orders, clients or money movements.
 *
 * Moving Pro off such a workspace costs nobody anything, so a restore that
 * would otherwise ask "move it here?" can just do it. The typical case is a
 * workspace left behind by an earlier onboarding. Any read error answers
 * `false`: when in doubt, the user is asked.
 */
export async function companyHasNoData(companyId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const company = db.collection("companies").doc(companyId);
  const probes = [
    ...["motors", "engines", "inventoryItems", "financialOperations", "operations"].map((name) =>
      db.collection(name).where("companyId", "==", companyId).limit(1),
    ),
    ...["workOrders", "clients", "vehicles", "quotes", "engineIntakeJobs"].map((name) =>
      company.collection(name).limit(1),
    ),
  ];
  try {
    const snaps = await Promise.all(probes.map((query) => query.get()));
    return snaps.every((snap) => snap.empty);
  } catch {
    return false;
  }
}

export type ApplyResult = {
  proActive: boolean;
  planId: string | null;
  status: string;
  /** True when this call moved the subscription off another workspace. */
  transferred: boolean;
  /** Set when the write was skipped as stale — the stored term is newer. */
  skipped?: "stale";
};

export type ApplyOptions = {
  companyId: string;
  transaction: AppleTransaction;
  renewal: AppleRenewalInfo | null;
  /** uid that presented the transaction, recorded on the link. */
  uid?: string | null;
  /**
   * Move an Apple subscription already bound to another workspace. Off by
   * default: silently re-pointing it would leave the previous company on Pro
   * for a subscription it no longer holds.
   */
  allowTransfer?: boolean;
  now?: Date;
};

/**
 * Write the entitlement implied by a verified transaction.
 *
 * Idempotent by construction: the same transaction applied twice produces the
 * same document, which matters because StoreKit replays transactions on every
 * launch and Apple retries notifications for up to three days.
 *
 * Ordering is enforced as well as idempotency. Apple's notifications are not
 * delivered in order and the app drains its queue on every launch, so an older
 * transaction for the same subscription can arrive after a newer one. Applying
 * it verbatim would shorten `currentPeriodEnd` and expire a live subscription —
 * one of the ways Pro "disappeared" a few minutes after it was bought.
 */
export async function applyAppleTransaction(options: ApplyOptions): Promise<ApplyResult> {
  const now = options.now ?? new Date();
  const { companyId, transaction, renewal, uid = null, allowTransfer = false } = options;
  const originalTransactionId = transaction.originalTransactionId ?? null;

  const db = getAdminFirestore();

  return db.runTransaction(async (tx) => {
    // --- reads first; Firestore transactions forbid a read after a write ---
    const link = originalTransactionId ? linkRef(originalTransactionId) : null;
    const linkSnap = link ? await tx.get(link) : null;
    const boundCompanyId = (linkSnap?.data() as LinkDoc | undefined)?.companyId?.trim() || null;

    const target = subscriptionRef(companyId);
    const targetSnap = await tx.get(target);
    const stored = (targetSnap.data() as StoredSubscription | undefined) ?? {};

    // Throws `bound_to_other_company` when the subscription is someone else's
    // and no transfer was asked for.
    const decision = decideEntitlementWrite({
      companyId,
      transaction,
      renewal,
      boundCompanyId,
      storedPeriodEndMs:
        stored.currentPeriodEnd instanceof Timestamp ? stored.currentPeriodEnd.toMillis() : null,
      storedOriginalTransactionId: stored.appleOriginalTransactionId ?? null,
      storedProActive: stored.proActive === true,
      allowTransfer,
      now,
    });

    if (decision.kind === "skip_stale") {
      return {
        proActive: decision.proActive,
        planId: decision.planId,
        status: decision.status,
        transferred: false,
        skipped: "stale" as const,
      };
    }

    // --- writes ---
    const { document } = decision;

    if (decision.transferFrom) {
      tx.set(
        subscriptionRef(decision.transferFrom),
        {
          plan: "free",
          status: "canceled",
          proActive: false,
          appleTransferredTo: companyId,
          appleTransferredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    tx.set(
      target,
      {
        plan: document.plan,
        status: document.status,
        proActive: document.proActive,
        provider: document.provider,
        billingInterval: document.billingInterval,
        appleProductId: document.appleProductId,
        appleOriginalTransactionId: document.appleOriginalTransactionId,
        appleTransactionId: document.appleTransactionId,
        appleEnvironment: document.appleEnvironment,
        willAutoRenew: document.willAutoRenew,
        trialUsed: document.trialUsed,
        ...(document.currentPeriodEnd
          ? { currentPeriodEnd: Timestamp.fromDate(document.currentPeriodEnd) }
          : {}),
        ...(document.revoked ? { revokedAt: FieldValue.serverTimestamp() } : { revokedAt: null }),
        // Clearing this keeps a re-attached workspace from looking transferred.
        appleTransferredTo: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (link) {
      tx.set(
        link,
        {
          companyId,
          ...(uid ? { boundByUid: uid } : {}),
          ...(decision.transferFrom ? { previousCompanyId: decision.transferFrom } : {}),
          ...(boundCompanyId ? {} : { boundAt: FieldValue.serverTimestamp() }),
          productId: transaction.productId ?? null,
          environment: transaction.environment ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return {
      proActive: document.proActive,
      planId: decision.planId,
      status: document.status,
      transferred: decision.transferFrom !== null,
    };
  });
}
