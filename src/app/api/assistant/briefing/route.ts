import { NextResponse, type NextRequest } from "next/server";

import { loadOrCompileCompanyBriefing } from "@/lib/ai/company-brain.server";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { userCopy } from "@/lib/user-copy";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    const briefing = await loadOrCompileCompanyBriefing(access.companyId);
    return NextResponse.json({ briefing });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      const status = error.status === 401 || error.status === 403 ? error.status : 401;
      return NextResponse.json({ error: userCopy.ai.errorForbidden }, { status });
    }
    console.error("[assistant:briefing]", error);
    return NextResponse.json({ error: userCopy.ai.errorGeneric }, { status: 500 });
  }
}
