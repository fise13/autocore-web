import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { deleteCompanyAsOwner } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { companyId?: unknown; confirmationName?: unknown };
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const confirmationName =
      typeof body.confirmationName === "string" ? body.confirmationName : "";
    if (!companyId || !confirmationName) {
      return NextResponse.json(
        { error: "Provide companyId and the name to confirm" },
        { status: 400 },
      );
    }

    await deleteCompanyAsOwner({
      uid: access.uid,
      companyId,
      confirmationName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = orgErrorResponse(error);
    return NextResponse.json(
      { code: mapped.code, error: mapped.error, title: mapped.title },
      { status: mapped.status },
    );
  }
}
