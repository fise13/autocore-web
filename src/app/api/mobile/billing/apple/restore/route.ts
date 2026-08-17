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
import { fetchTransaction } from "@/lib/billing/apple/app-store-server-api";
import {
  AppleRejectionError,
  assertTransactionUsable,
  type AppleTransaction,
} from "@/lib/billing/apple/transaction-payload";

export const runtime = "nodejs";

/**
 * Re-attach a subscription the user already owns — new device, reinstall, or a
 * purchase that never made it past verification the first time.
 *
 * The app sends everything StoreKit knows about; each entry is checked
 * independently and the first one that still entitles wins. Every entry failing
 * is a normal outcome, not an error: it means this Apple ID holds nothing for
 * this workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as {
      companyId?: string;
      transactions?: Array<{ transactionId?: string }>;
    };

    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await verifyCompanyOwner(access.uid, companyId);

    const stored = await readStoredSubscription(companyId);
    assertNotStripeManaged(stored);

    const credentials = requireAppStoreCredentials();
    const accepted = appleEnvironmentsAccepted();
    const now = new Date();

    const ids = (body.transactions ?? [])
      .map((entry) => entry.transactionId?.trim())
      .filter((value): value is string => Boolean(value));

    if (ids.length === 0) {
      return NextResponse.json({ restored: false });
    }

    // The most recent usable transaction is the one worth writing; a lapsed
    // older term must not overwrite a live one, so all are checked first.
    let best: AppleTransaction | null = null;
    let lastReason: AppleRejectionError | null = null;

    for (const transactionId of ids) {
      let transaction: AppleTransaction;
      try {
        transaction = await fetchTransaction(transactionId);
      } catch {
        // Unknown to Apple (or the wrong environment) — try the next one.
        continue;
      }

      try {
        assertTransactionUsable({
          transaction,
          expectedBundleId: credentials.bundleId,
          expectedAppAccountToken: stored.appleAppAccountToken ?? null,
          acceptedEnvironments: accepted,
          knownProductIds: APPLE_PRODUCT_IDS,
          now,
        });
      } catch (error) {
        if (error instanceof AppleRejectionError) {
          lastReason = error;
          continue;
        }
        throw error;
      }

      const currentEnd = best?.expiresDate ?? 0;
      if ((transaction.expiresDate ?? 0) >= currentEnd) {
        best = transaction;
      }
    }

    if (!best) {
      return NextResponse.json({
        restored: false,
        ...(lastReason ? { reason: lastReason.reason } : {}),
      });
    }

    const result = await applyAppleTransaction({ companyId, transaction: best, renewal: null });

    return NextResponse.json({
      restored: true,
      proActive: result.proActive,
      planId: result.planId ?? undefined,
    });
  } catch (error) {
    if (error instanceof AppleRejectionError) {
      return NextResponse.json({ restored: false, reason: error.reason });
    }
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AppStoreNotConfiguredError) {
      console.error("[mobile/billing/apple/restore]", error.message);
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[mobile/billing/apple/restore]", error);
    return NextResponse.json({ error: "Could not restore purchases" }, { status: 502 });
  }
}
