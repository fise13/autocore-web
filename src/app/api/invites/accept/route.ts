import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { acceptInviteAsUser } from "@/infrastructure/firestore/invite-org-service.server";
import { orgErrorResponse } from "@autocore/org";

export const runtime = "nodejs";

type AcceptBody = {
  token?: unknown;
  switchToCompany?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as AcceptBody;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Укажите токен приглашения" }, { status: 400 });
    }

    const userSnap = await import("@/infrastructure/firebase/admin").then(({ getAdminFirestore }) =>
      getAdminFirestore().collection("users").doc(access.uid).get(),
    );
    const userData = userSnap.data() ?? {};

    const result = await acceptInviteAsUser({
      uid: access.uid,
      token,
      userEmail: String(userData.email ?? ""),
      userName: String(userData.name ?? userData.displayName ?? ""),
      switchToCompany: body.switchToCompany === true,
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
