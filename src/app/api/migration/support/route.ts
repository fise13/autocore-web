import { NextRequest, NextResponse } from "next/server";

import { getResend, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const comment = String(form.get("comment") ?? "").trim();
    const contactEmail = String(form.get("email") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim() || "—";
    const file = form.get("file");

    if (!comment && !(file instanceof File)) {
      return NextResponse.json(
        { error: "Опишите проблему или приложите файл." },
        { status: 400 },
      );
    }

    if (!isResendConfigured()) {
      // Surface the support address so the UI can fall back to mailto.
      return NextResponse.json(
        { error: "email_not_configured", support: getPlatformContacts().email },
        { status: 503 },
      );
    }

    const attachments: Array<{ filename: string; content: Buffer }> = [];
    if (file instanceof File) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: "Файл слишком большой (максимум 15 МБ)." },
          { status: 413 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({ filename: file.name, content: buffer });
    }

    const support = getPlatformContacts().email;
    const html = `
      <h2>Запрос помощи с импортом</h2>
      <p><strong>Компания:</strong> ${escapeHtml(companyName)}</p>
      <p><strong>Контакт:</strong> ${escapeHtml(contactEmail || "не указан")}</p>
      <p><strong>Комментарий:</strong></p>
      <p>${escapeHtml(comment || "—").replace(/\n/g, "<br/>")}</p>
    `;

    const resend = getResend();
    await resend.emails.send({
      from: getSupportFrom(),
      to: support,
      replyTo: contactEmail || undefined,
      subject: `Помощь с импортом — ${companyName}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[migration/support]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось отправить запрос" },
      { status: 500 },
    );
  }
}
