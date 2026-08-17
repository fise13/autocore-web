import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { ensureAppAccountToken } from "@/lib/billing/apple/apple-entitlement.server";

export const runtime = "nodejs";

/**
 * Mint (or return) the `appAccountToken` the app attaches to a StoreKit
 * purchase. Apple echoes it back inside the signed transaction, which is what
 * later proves the payment belongs to this workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const appAccountToken = await ensureAppAccountToken(companyId, access.uid);
    return NextResponse.json({ appAccountToken });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/billing/apple/link]", error);
    return NextResponse.json({ error: "Failed to prepare the purchase" }, { status: 500 });
  }
}
