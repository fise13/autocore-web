import { NextRequest, NextResponse } from "next/server";

import { startInternalTrial } from "@/lib/billing/internal-subscription.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const result = await startInternalTrial(companyId, access.uid);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[billing/start-trial]", error);
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
  }
}
