import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";
import { setMemberActiveAsAdmin } from "@/infrastructure/firestore/org-members-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const manager = await verifyCompanyManager(access.uid, "employee_manage");

    const body = (await request.json()) as {
      userId?: unknown;
      companyId?: unknown;
      isActive?: unknown;
    };
    const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const companyId =
      typeof body.companyId === "string" && body.companyId.trim()
        ? body.companyId.trim()
        : manager.companyId;
    const isActive = body.isActive === true;

    if (!targetUserId) {
      return NextResponse.json({ error: "Укажите сотрудника" }, { status: 400 });
    }

    await setMemberActiveAsAdmin({
      actorUserId: access.uid,
      companyId,
      targetUserId,
      isActive,
    });

    return NextResponse.json({ ok: true });
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
