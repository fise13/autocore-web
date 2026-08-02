import { NextRequest, NextResponse } from "next/server";

import { BillingInterval } from "@/domain/billing";
import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { activateInternalPro } from "@/lib/billing/internal-subscription.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

function internalActivationEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_INTERNAL_PRO_ACTIVATION?.trim().toLowerCase() === "true"
  );
}

/**
 * Optional production allow-list.
 *
 * Turning `ALLOW_INTERNAL_PRO_ACTIVATION` on in production would otherwise let
 * any company owner grant themselves Pro for free. Setting
 * `INTERNAL_PRO_ALLOWED_EMAILS` narrows it to named accounts — which is what an
 * App Store review login needs, without opening the door to everyone.
 * Empty (the default) keeps the previous behaviour outside production.
 */
function callerMayActivate(email: string | null | undefined): boolean {
  const raw = process.env.INTERNAL_PRO_ALLOWED_EMAILS?.trim();
  if (!raw) return true;

  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;

  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && allowed.includes(normalized));
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

    const caller = await getAdminAuth().getUser(access.uid);
    if (!callerMayActivate(caller.email)) {
      return NextResponse.json({ error: "Internal Pro activation is disabled" }, { status: 403 });
    }

    const body = (await request.json()) as {
      companyId?: string;
      interval?: string;
      lifetime?: boolean;
    };
    const companyId = body.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const result = await activateInternalPro(companyId, access.uid, normalizeInterval(body.interval), {
      lifetime: body.lifetime === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[billing/activate-pro]", error);
    return NextResponse.json({ error: "Failed to activate Pro" }, { status: 500 });
  }
}
