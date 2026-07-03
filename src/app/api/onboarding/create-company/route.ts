import { NextRequest, NextResponse } from "next/server";

import { createCompanyAsAdmin } from "@/infrastructure/firestore/company-service.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

type CreateCompanyPayload = {
  name?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as CreateCompanyPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Укажите название компании" }, { status: 400 });
    }

    const companyId = await createCompanyAsAdmin(access.uid, name);
    return NextResponse.json({ ok: true, companyId });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[onboarding/create-company]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать компанию" },
      { status: 500 },
    );
  }
}
