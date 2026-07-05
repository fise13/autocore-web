import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  runCompanyNotificationRules,
  runEveningNotificationRules,
  runMorningNotificationRules,
} from "@/lib/notifications/rule-evaluators.server";

export const runtime = "nodejs";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = request.nextUrl.searchParams.get("schedule") ?? "hourly";
  const companiesSnap = await getAdminFirestore().collection("companies").limit(200).get();

  let evaluated = 0;
  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id;
    if (schedule === "evening") {
      await runEveningNotificationRules(companyId);
    } else if (schedule === "morning") {
      await runMorningNotificationRules(companyId);
    } else {
      await runCompanyNotificationRules(companyId);
    }
    evaluated += 1;
  }

  return NextResponse.json({ ok: true, evaluated, schedule });
}
