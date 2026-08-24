import { NextRequest, NextResponse } from "next/server";

import { authorizeCron } from "@/lib/cron/authorize-cron";
import { pageAllCompanyIds } from "@/lib/cron/page-company-ids";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  runCompanyNotificationRules,
  runEveningNotificationRules,
  runMorningNotificationRules,
} from "@/lib/notifications/rule-evaluators.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = request.nextUrl.searchParams.get("schedule") ?? "hourly";
  const { companyIds, pages } = await pageAllCompanyIds(getAdminFirestore());

  let evaluated = 0;
  let failed = 0;
  for (const companyId of companyIds) {
    try {
      if (schedule === "evening") {
        await runEveningNotificationRules(companyId);
      } else if (schedule === "morning") {
        await runMorningNotificationRules(companyId);
      } else {
        await runCompanyNotificationRules(companyId);
      }
      evaluated += 1;
    } catch (error) {
      failed += 1;
      console.error("[cron/notifications] company failed", {
        companyId,
        schedule,
        error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    evaluated,
    failed,
    scanned: companyIds.length,
    pages,
    schedule,
  });
}

/** Vercel Cron invokes schedules with GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
