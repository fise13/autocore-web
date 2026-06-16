import { NextRequest, NextResponse } from "next/server";

import { ensureDemoWorkspace } from "@/lib/demo/demo-provision.server";
import { isDemoAccountEmail } from "@/lib/demo/demo-config";
import { resetDemoWorkspaceData } from "@/lib/demo/demo-reset.server";
import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const user = await getAdminAuth().getUser(access.uid);
    const email = user.email ?? null;

    if (!isDemoAccountEmail(email)) {
      return NextResponse.json({ error: "Not a demo account" }, { status: 403 });
    }

    const result = await resetDemoWorkspaceData(access.uid);
    await ensureDemoWorkspace(access.uid);

    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[demo/reset]", error);
    return NextResponse.json({ error: "Failed to reset demo workspace" }, { status: 500 });
  }
}
