import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { getPlatformContacts, getSupportAgentEmail } from "@/lib/platform/platform-contacts";

export const runtime = "nodejs";

function appInboxUrl(threadId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin.replace(/\/$/, "")}/support/inbox/${encodeURIComponent(threadId)}`;
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as { threadId?: unknown };
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    if (!threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userSnap = await db.collection("users").doc(access.uid).get();
    const companyId = String(userSnap.data()?.companyId ?? "").trim();
    if (!companyId) {
      return NextResponse.json({ error: "Company not linked" }, { status: 403 });
    }

    const threadRef = db
      .collection("companies")
      .doc(companyId)
      .collection("supportThreads")
      .doc(threadId);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    const thread = threadSnap.data() as { userId?: string; userName?: string; userEmail?: string };
    if (thread.userId !== access.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resendKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    const agentEmail = getSupportAgentEmail();
    const contacts = getPlatformContacts();

    if (!resendKey || !fromEmail) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const inboxUrl = appInboxUrl(threadId);
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: agentEmail,
      replyTo: thread.userEmail ?? contacts.email,
      subject: `AutoCore: нужен оператор — ${thread.userName ?? thread.userEmail ?? "пользователь"}`,
      html: `
        <p>Пользователь запросил живого оператора в чате поддержки.</p>
        <p><strong>Имя:</strong> ${thread.userName ?? "—"}</p>
        <p><strong>Email:</strong> ${thread.userEmail ?? "—"}</p>
        <p><strong>Компания:</strong> ${companyId}</p>
        <p><a href="${inboxUrl}">Открыть диалог в AutoCore</a></p>
        <p>Если ссылка не работает: ${inboxUrl}</p>
      `,
    });

    return NextResponse.json({ ok: true, inboxUrl });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[support/notify-agent]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to notify agent" },
      { status: 500 },
    );
  }
}
