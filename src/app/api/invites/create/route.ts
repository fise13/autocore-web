import { NextRequest, NextResponse } from "next/server";

import { UserRole, USER_ROLES } from "@/domain/user";
import { createInviteAsAdmin } from "@/infrastructure/firestore/invite-org-service.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";

export const runtime = "nodejs";

function normalizeRole(role: string): UserRole {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "employee";
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const manager = await verifyCompanyManager(access.uid, "employee_manage");

    const body = (await request.json()) as {
      role?: unknown;
      ttlHours?: unknown;
      email?: unknown;
    };

    const role = normalizeRole(typeof body.role === "string" ? body.role : "employee");
    const ttlHours = typeof body.ttlHours === "number" ? body.ttlHours : Number(body.ttlHours) || 72;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;

    const inviterSnap = await getAdminFirestore().collection("users").doc(access.uid).get();
    const inviterName = inviterSnap.exists ? String(inviterSnap.data()?.name ?? "") : "";

    const created = await createInviteAsAdmin({
      companyId: manager.companyId,
      createdBy: access.uid,
      createdByName: inviterName || undefined,
      role,
      ttlHours,
      email,
    });

    return NextResponse.json({
      inviteId: created.inviteId,
      code: created.code,
      token: created.token,
      joinUrl: created.joinUrl,
      email: created.email,
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[invites/create]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать приглашение" },
      { status: 500 },
    );
  }
}
