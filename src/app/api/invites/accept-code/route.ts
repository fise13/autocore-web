import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { acceptInviteByCodeAsUser } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

type AcceptCodeBody = {
  code?: unknown;
  switchToCompany?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as AcceptCodeBody;
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "Provide an invitation code" }, { status: 400 });
    }

    const userSnap = await import("@/infrastructure/firebase/admin").then(({ getAdminFirestore }) =>
      getAdminFirestore().collection("users").doc(access.uid).get(),
    );
    const userData = userSnap.data() ?? {};

    const result = await acceptInviteByCodeAsUser({
      uid: access.uid,
      rawCode: code,
      userEmail: String(userData.email ?? ""),
      userName: String(userData.name ?? userData.displayName ?? ""),
      switchToCompany: body.switchToCompany !== false,
    });

    return NextResponse.json({ ok: true, result });
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
