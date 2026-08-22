import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyMembership } from "@/lib/auth/verify-company-manager.server";
import { AppStoreNotConfiguredError } from "@/lib/billing/apple/apple-config";
import {
  applyAppleTransaction,
  readStoredSubscription,
} from "@/lib/billing/apple/apple-entitlement.server";
import { fetchSubscriptionStatuses } from "@/lib/billing/apple/app-store-server-api";
import { AppleRejectionError } from "@/lib/billing/apple/transaction-payload";

export const runtime = "nodejs";

/**
 * Pull the current state of a workspace's Apple subscription from Apple.
 *
 * App Store Server Notifications are the primary channel, but they are a push
 * channel: if the endpoint was not yet configured in App Store Connect, or a
 * delivery was lost, or the workspace was linked after the notification fired,
 * the stored document freezes at whatever the last successful write said. A
 * frozen document is not a neutral failure — it either keeps a lapsed workspace
 * on Pro or leaves a paying one locked out.
 *
 * This is the pull side of the same fact, called on foreground. It never trusts
 * the client: the only input is which company to look at, and the answer comes
 * from Apple over an authenticated call.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await verifyCompanyMembership(access.uid, companyId);

    const stored = await readStoredSubscription(companyId);
    const originalTransactionId = stored.appleOriginalTransactionId?.trim();

    if (stored.provider !== "apple" || !originalTransactionId) {
      // Stripe, internal trial, or a workspace that never bought through Apple.
      return NextResponse.json({ reconciled: false, reason: "not_apple" });
    }

    const states = await fetchSubscriptionStatuses(originalTransactionId);
    if (states.length === 0) {
      return NextResponse.json({ reconciled: false, reason: "not_found" });
    }

    // Apple returns every transaction in the group. The live term is the one
    // that ends last; an earlier one is a superseded plan, not the truth.
    const latest = states.reduce((best, state) =>
      (state.transaction.expiresDate ?? 0) > (best.transaction.expiresDate ?? 0) ? state : best,
    );

    const result = await applyAppleTransaction({
      companyId,
      transaction: latest.transaction,
      renewal: latest.renewal,
      uid: access.uid,
    });

    return NextResponse.json({
      reconciled: true,
      proActive: result.proActive,
      status: result.status,
      planId: result.planId ?? undefined,
    });
  } catch (error) {
    if (error instanceof AppleRejectionError) {
      return NextResponse.json({ reconciled: false, reason: error.reason });
    }
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AppStoreNotConfiguredError) {
      return NextResponse.json({ reconciled: false, reason: "not_configured" });
    }
    console.error("[mobile/billing/apple/reconcile]", error);
    return NextResponse.json({ error: "Could not refresh the subscription" }, { status: 502 });
  }
}
