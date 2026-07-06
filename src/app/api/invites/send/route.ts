import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { UserRole, USER_ROLES } from "@/domain/user";
import { createInviteAsAdmin } from "@/infrastructure/firestore/invite-org-service.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { getResend, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import {
  buildInviteEmailHtml,
  buildInviteEmailSubject,
} from "@/lib/email/templates/invite-email";
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
      email?: unknown;
      role?: unknown;
      ttlHours?: unknown;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
    }

    const role = normalizeRole(typeof body.role === "string" ? body.role : "employee");
    const ttlHours = Math.min(Math.max(Number(body.ttlHours) || 72, 1), 168);

    const db = getAdminFirestore();
    const companySnap = await db.collection("companies").doc(manager.companyId).get();
    const companyName = String(companySnap.data()?.name ?? "AutoCore");

    const inviterSnap = await db.collection("users").doc(access.uid).get();
    const inviterName = inviterSnap.exists ? String(inviterSnap.data()?.name ?? "") : "";

    const created = await createInviteAsAdmin({
      companyId: manager.companyId,
      createdBy: access.uid,
      createdByName: inviterName || undefined,
      email,
      role,
      ttlHours,
    });

    if (!isResendConfigured()) {
      return NextResponse.json(
        {
          error: "Email service not configured",
          inviteId: created.inviteId,
          joinUrl: created.joinUrl,
        },
        { status: 503 },
      );
    }

    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const resend = getResend();
    await resend.emails.send({
      from: getSupportFrom(),
      to: email,
      subject: buildInviteEmailSubject(companyName),
      html: buildInviteEmailHtml({
        joinUrl: created.joinUrl,
        companyName,
        role,
        expiresAt,
      }),
    });

    return NextResponse.json({
      inviteId: created.inviteId,
      joinUrl: created.joinUrl,
      email,
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[invites/send]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invite" },
      { status: 500 },
    );
  }
}
