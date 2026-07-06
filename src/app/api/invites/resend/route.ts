import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";
import { resendInviteAsAdmin } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { inviteId?: unknown; ttlHours?: unknown };
    const inviteId = typeof body.inviteId === "string" ? body.inviteId.trim() : "";
    if (!inviteId) {
      return NextResponse.json({ error: "inviteId обязателен" }, { status: 400 });
    }

    const manager = await verifyCompanyManager(access.uid, "employee_manage");
    const result = await resendInviteAsAdmin({
      inviteId,
      companyId: manager.companyId,
      ttlHours: typeof body.ttlHours === "number" ? body.ttlHours : undefined,
    });

    return NextResponse.json({ ok: true, joinUrl: result.joinUrl });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = orgErrorResponse(error);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
