import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyBillingManager } from "@/lib/auth/verify-company-manager.server";
import {
  AppStoreNotConfiguredError,
  appleEnvironmentsAccepted,
  APPLE_PRODUCT_IDS,
  requireAppStoreCredentials,
} from "@/lib/billing/apple/apple-config";
import {
  applyAppleTransaction,
  assertNotStripeManaged,
  companyDisplayName,
  companyForOriginalTransaction,
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
 *
 * A subscription already bound to a different workspace is reported as such
 * rather than quietly re-pointed. Restoring one Apple ID into a second company
 * used to leave both companies marked Pro off a single payment; the caller now
 * has to ask for a transfer explicitly (`transfer: true`), which moves the
 * entitlement and revokes it from the previous workspace in one transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as {
      companyId?: string;
      transfer?: boolean;
      transactions?: Array<{ transactionId?: string }>;
    };

    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await verifyCompanyBillingManager(access.uid, companyId);

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
    // Transactions belonging to another workspace are set aside rather than
    // discarded — if nothing else restores, that conflict is the real answer.
    let best: AppleTransaction | null = null;
    let lastReason: AppleRejectionError | null = null;
    let conflict: { transaction: AppleTransaction; companyId: string } | null = null;

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

      const owner = transaction.originalTransactionId
        ? await companyForOriginalTransaction(transaction.originalTransactionId)
        : null;

      if (owner && owner !== companyId && !body.transfer) {
        if (!conflict) conflict = { transaction, companyId: owner };
        continue;
      }

      const currentEnd = best?.expiresDate ?? 0;
      if ((transaction.expiresDate ?? 0) >= currentEnd) {
        best = transaction;
      }
    }

    if (!best) {
      if (conflict) {
        return NextResponse.json({
          restored: false,
          reason: "bound_to_other_company",
          conflictCompany: await companyDisplayName(conflict.companyId),
        });
      }
      return NextResponse.json({
        restored: false,
        ...(lastReason ? { reason: lastReason.reason } : {}),
      });
    }

    const result = await applyAppleTransaction({
      companyId,
      transaction: best,
      renewal: null,
      uid: access.uid,
      allowTransfer: body.transfer === true,
    });

    return NextResponse.json({
      restored: true,
      proActive: result.proActive,
      planId: result.planId ?? undefined,
      transferred: result.transferred,
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
