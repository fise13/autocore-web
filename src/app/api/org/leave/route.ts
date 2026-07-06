import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { leaveCompanyAsUser } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: unknown };
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    if (!companyId) {
      return NextResponse.json({ error: "companyId обязателен" }, { status: 400 });
    }

    const result = await leaveCompanyAsUser({ uid: access.uid, companyId });
    return NextResponse.json({ ok: true, nextCompanyId: result.nextCompanyId });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = orgErrorResponse(error);
    return NextResponse.json(
      { code: mapped.code, error: mapped.error, title: mapped.title, action: mapped.action },
      { status: mapped.status },
    );
  }
}
