import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";
import {
  AppStoreNotConfiguredError,
  appleEnvironmentsAccepted,
  APPLE_PRODUCT_IDS,
  requireAppStoreCredentials,
} from "@/lib/billing/apple/apple-config";
import {
  applyAppleTransaction,
  assertNotStripeManaged,
  readStoredSubscription,
} from "@/lib/billing/apple/apple-entitlement.server";
import {
  fetchSubscriptionStatuses,
  fetchTransaction,
} from "@/lib/billing/apple/app-store-server-api";
import {
  AppleRejectionError,
  assertTransactionUsable,
} from "@/lib/billing/apple/transaction-payload";

export const runtime = "nodejs";

/**
 * Honour a StoreKit purchase.
 *
 * The app sends a transaction id and its signed JWS after StoreKit 2
 * `Transaction.VerificationResult` succeeded on device. Neither is trusted:
 * the transaction is re-fetched from Apple's App Store Server API over an
 * authenticated call, and only Apple's copy is inspected. A JWS lifted from
 * another device therefore buys nothing — the id resolves to a transaction whose
 * `appAccountToken` belongs to a different workspace, and the check below fails.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as {
      companyId?: string;
      transactionId?: string;
      productId?: string;
    };

    const companyId = body.companyId?.trim();
    const transactionId = body.transactionId?.trim();
    if (!companyId || !transactionId) {
      return NextResponse.json(
        { error: "companyId and transactionId are required" },
        { status: 400 },
      );
    }

    // Only the workspace owner can attach a subscription to the workspace.
    await verifyCompanyOwner(access.uid, companyId);

    const stored = await readStoredSubscription(companyId);
    assertNotStripeManaged(stored);

    const credentials = requireAppStoreCredentials();
    const transaction = await fetchTransaction(transactionId);

    assertTransactionUsable({
      transaction,
      expectedBundleId: credentials.bundleId,
      expectedAppAccountToken: stored.appleAppAccountToken ?? null,
      acceptedEnvironments: appleEnvironmentsAccepted(),
      knownProductIds: APPLE_PRODUCT_IDS,
      now: new Date(),
    });

    // Renewal info carries auto-renew state and grace periods, which the
    // transaction alone does not. Best effort: absence must not block a
    // purchase that Apple has already confirmed.
    const renewal = transaction.originalTransactionId
      ? await fetchSubscriptionStatuses(transaction.originalTransactionId)
          .then(
            (states) =>
              states.find(
                (state) =>
                  state.transaction.originalTransactionId === transaction.originalTransactionId,
              )?.renewal ?? null,
          )
          .catch(() => null)
      : null;

    const result = await applyAppleTransaction({ companyId, transaction, renewal });

    return NextResponse.json({
      accepted: true,
      proActive: result.proActive,
      planId: result.planId ?? undefined,
    });
  } catch (error) {
    if (error instanceof AppleRejectionError) {
      // 200 with `accepted: false` — the request was well-formed, the purchase
      // simply does not entitle. The app renders a reason for each of these.
      return NextResponse.json({ accepted: false, reason: error.reason });
    }
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AppStoreNotConfiguredError) {
      console.error("[mobile/billing/apple/verify]", error.message);
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[mobile/billing/apple/verify]", error);
    return NextResponse.json({ error: "Could not verify the purchase" }, { status: 502 });
  }
}
