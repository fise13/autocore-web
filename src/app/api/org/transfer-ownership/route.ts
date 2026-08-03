import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { transferOwnershipAsOwner } from "@/infrastructure/firestore/org-members-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as {
      companyId?: unknown;
      newOwnerUserId?: unknown;
    };
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const newOwnerUserId =
      typeof body.newOwnerUserId === "string" ? body.newOwnerUserId.trim() : "";
    if (!companyId || !newOwnerUserId) {
      return NextResponse.json(
        { error: "companyId and newOwnerUserId are required" },
        { status: 400 },
      );
    }

    await transferOwnershipAsOwner({
      actorUserId: access.uid,
      companyId,
      newOwnerUserId,
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
