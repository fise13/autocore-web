import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyOwner } from "@/lib/auth/verify-company-manager.server";
import { isPaddleServerConfigured } from "@/lib/paddle/config";
import { syncPaddleSubscriptionForCompany } from "@/lib/paddle/sync-paddle-subscription";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isPaddleServerConfigured()) {
      return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
    }

    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string; transactionId?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    await verifyCompanyOwner(access.uid, companyId);
    const proActive = await syncPaddleSubscriptionForCompany(companyId, {
      transactionId: body.transactionId,
    });
    return NextResponse.json({ proActive });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/billing/paddle/sync]", error);
    return NextResponse.json({ error: "Failed to sync Paddle subscription" }, { status: 500 });
  }
}
