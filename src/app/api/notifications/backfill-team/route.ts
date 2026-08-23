import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";
import { backfillTeamJoinNotificationsForCompany } from "@/lib/notifications/team-events.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const manager = await verifyCompanyManager(access.uid, "employee_manage");

    const body = (await request.json().catch(() => ({}))) as { dryRun?: unknown };
    const dryRun = body.dryRun === true;

    const result = await backfillTeamJoinNotificationsForCompany({
      companyId: manager.companyId,
      dryRun,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[notifications/backfill-team]", error);
    return NextResponse.json({ error: "Could not restore notifications" }, { status: 500 });
  }
}
