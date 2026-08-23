import { NextRequest, NextResponse } from "next/server";

import type { CompanyAppConfig } from "@/domain/company-config";
import { completeCompanySetupAsAdmin } from "@/infrastructure/firestore/complete-setup.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

type CompleteSetupPayload = {
  companyId?: unknown;
  config?: unknown;
};

function isCompanyAppConfig(value: unknown): value is CompanyAppConfig {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.modules === "object" &&
    data.modules != null &&
    Array.isArray(data.specificCategories) &&
    typeof data.defaultWarrantyTemplate === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as CompleteSetupPayload;
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    if (!companyId) {
      return NextResponse.json({ error: "Provide a company" }, { status: 400 });
    }
    if (!isCompanyAppConfig(body.config)) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    const config = await completeCompanySetupAsAdmin(access.uid, companyId, body.config);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[onboarding/complete-setup]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save settings" },
      { status: 500 },
    );
  }
}
