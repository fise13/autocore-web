import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";
import { revokeInviteAsAdmin } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { inviteId?: unknown };
    const inviteId = typeof body.inviteId === "string" ? body.inviteId.trim() : "";
    if (!inviteId) {
      return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
    }

    const manager = await verifyCompanyManager(access.uid, "employee_manage");
    await revokeInviteAsAdmin({
      inviteId,
      companyId: manager.companyId,
      revokedBy: access.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = orgErrorResponse(error);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
