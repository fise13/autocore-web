import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { UserRole, USER_ROLES } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { generateInviteToken } from "@/lib/invites/invite-token";
import { getResend, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import {
  buildInviteEmailHtml,
  buildInviteEmailSubject,
} from "@/lib/email/templates/invite-email";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { verifyCompanyManager } from "@/lib/auth/verify-company-manager.server";

export const runtime = "nodejs";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

function normalizeRole(role: string): UserRole {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "employee";
}

function appJoinUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin.replace(/\/$/, "")}/join?token=${encodeURIComponent(token)}`;
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
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    const db = getAdminFirestore();
    const companySnap = await db.collection("companies").doc(manager.companyId).get();
    const companyName = String(companySnap.data()?.name ?? "AutoCore");

    let code = generateInviteCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existing = await db.collection("invites").where("code", "==", code).limit(1).get();
      if (existing.empty) break;
      code = generateInviteCode();
    }

    const token = generateInviteToken();
    const inviteRef = await db.collection("invites").add({
      code,
      token,
      email,
      companyId: manager.companyId,
      role,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      createdBy: access.uid,
      used: false,
      status: "pending",
    });

    if (!isResendConfigured()) {
      return NextResponse.json(
        {
          error: "Email service not configured",
          inviteId: inviteRef.id,
          joinUrl: appJoinUrl(token),
        },
        { status: 503 },
      );
    }

    const joinUrl = appJoinUrl(token);
    const resend = getResend();
    await resend.emails.send({
      from: getSupportFrom(),
      to: email,
      subject: buildInviteEmailSubject(companyName),
      html: buildInviteEmailHtml({
        joinUrl,
        companyName,
        role,
        expiresAt,
      }),
    });

    return NextResponse.json({
      inviteId: inviteRef.id,
      joinUrl,
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
