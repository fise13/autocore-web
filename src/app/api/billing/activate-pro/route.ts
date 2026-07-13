import { NextRequest, NextResponse } from "next/server";

import { BillingInterval } from "@/domain/billing";
import { activateInternalPro } from "@/lib/billing/internal-subscription.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

function internalActivationEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_INTERNAL_PRO_ACTIVATION?.trim().toLowerCase() === "true"
  );
}

function normalizeInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    if (!internalActivationEnabled()) {
      return NextResponse.json({ error: "Internal Pro activation is disabled" }, { status: 403 });
    }

    const body = (await request.json()) as { companyId?: string; interval?: string };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const result = await activateInternalPro(companyId, access.uid, normalizeInterval(body.interval));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[billing/activate-pro]", error);
    return NextResponse.json({ error: "Failed to activate Pro" }, { status: 500 });
  }
}
