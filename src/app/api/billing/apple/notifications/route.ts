import { NextRequest, NextResponse } from "next/server";

import { requireAppStoreCredentials } from "@/lib/billing/apple/apple-config";
import {
  applyAppleTransaction,
  companyForOriginalTransaction,
} from "@/lib/billing/apple/apple-entitlement.server";
import {
  AppleJwsError,
  verifyAppleJws,
} from "@/lib/billing/apple/verify-jws";
import {
  isIgnorableNotification,
  isTerminalNotification,
  type AppleNotificationPayload,
  type AppleRenewalInfo,
  type AppleTransaction,
} from "@/lib/billing/apple/transaction-payload";

export const runtime = "nodejs";
/** Apple posts here directly; nothing about this response may be cached. */
export const dynamic = "force-dynamic";

/**
 * App Store Server Notifications V2.
 *
 * Without this endpoint an Apple subscription is frozen at the moment it was
 * bought: renewals never extend it, cancellations and refunds never revoke it,
 * and an expired card keeps a workspace on Pro forever. Every state change
 * after the first purchase arrives here and nowhere else.
 *
 * The URL is public and unauthenticated by design — Apple has no credential to
 * present — so the signature *is* the authentication. `verifyAppleJws` walks the
 * embedded certificate chain to a pinned Apple root; a payload that fails it is
 * a stranger's POST and is refused.
 *
 * Configure in App Store Connect → App → App Information → App Store Server
 * Notifications (V2), production and sandbox both pointing at:
 *   https://app.myautocore.com/api/billing/apple/notifications
 */
export async function POST(request: NextRequest) {
  let signedPayload: string | undefined;
  try {
    const body = (await request.json()) as { signedPayload?: string };
    signedPayload = body.signedPayload?.trim();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!signedPayload) {
    return NextResponse.json({ error: "signedPayload is required" }, { status: 400 });
  }

  let payload: AppleNotificationPayload;
  try {
    payload = verifyAppleJws<AppleNotificationPayload>(signedPayload);
  } catch (error) {
    if (error instanceof AppleJwsError) {
      console.warn("[billing/apple/notifications] rejected:", error.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    throw error;
  }

  try {
    const credentials = requireAppStoreCredentials();
    if (payload.data?.bundleId && payload.data.bundleId !== credentials.bundleId) {
      // Correctly signed by Apple, but for a different app.
      return NextResponse.json({ error: "Unexpected bundle" }, { status: 401 });
    }

    if (isIgnorableNotification(payload.notificationType)) {
      return NextResponse.json({ ok: true, skipped: payload.notificationType });
    }

    const signedTransaction = payload.data?.signedTransactionInfo;
    if (!signedTransaction) {
      return NextResponse.json({ ok: true, skipped: "no transaction" });
    }

    // Nested JWS objects are signed independently and verified independently.
    const transaction = verifyAppleJws<AppleTransaction>(signedTransaction);
    const renewal = payload.data?.signedRenewalInfo
      ? verifyAppleJws<AppleRenewalInfo>(payload.data.signedRenewalInfo)
      : null;

    const originalTransactionId = transaction.originalTransactionId;
    if (!originalTransactionId) {
      return NextResponse.json({ ok: true, skipped: "no original transaction id" });
    }

    const companyId = await companyForOriginalTransaction(originalTransactionId);
    if (!companyId) {
      // A purchase we never saw verified — nothing to update. Answering 200
      // stops Apple retrying for three days over a notification we can never act on.
      console.warn(
        "[billing/apple/notifications] no company for original transaction",
        originalTransactionId,
      );
      return NextResponse.json({ ok: true, skipped: "unknown transaction" });
    }

    // A refund revokes immediately, whatever the dates say. Forcing the
    // revocation date makes the writer treat it as terminal.
    const effective: AppleTransaction = isTerminalNotification(payload.notificationType)
      ? { ...transaction, revocationDate: transaction.revocationDate ?? Date.now() }
      : transaction;

    const result = await applyAppleTransaction({
      companyId,
      transaction: effective,
      renewal,
    });

    return NextResponse.json({ ok: true, proActive: result.proActive });
  } catch (error) {
    // 500 makes Apple retry, which is what we want for a transient failure.
    console.error("[billing/apple/notifications]", error);
    return NextResponse.json({ error: "Failed to process notification" }, { status: 500 });
  }
}
