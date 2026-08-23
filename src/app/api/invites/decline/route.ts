import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { declineInviteAsUser } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Provide an invitation token" }, { status: 400 });
    }

    await declineInviteAsUser({ uid: access.uid, token });
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
