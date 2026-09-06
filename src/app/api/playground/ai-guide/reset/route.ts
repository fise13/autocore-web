import { NextResponse, type NextRequest } from "next/server";

import { isAiGuideAccountEmail, isAiGuideCompanyId } from "@/lib/playground/ai-guide/config";
import { resetAiGuideWorkspace } from "@/lib/playground/ai-guide/reset.server";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    if (!isAiGuideCompanyId(access.companyId) || !isAiGuideAccountEmail(access.profile.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await resetAiGuideWorkspace(access.uid);
    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("[playground/ai-guide/reset]", error);
    return NextResponse.json({ error: "Could not reset the playground" }, { status: 500 });
  }
}
