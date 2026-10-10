import { NextRequest, NextResponse } from "next/server";

import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import {
  enforceRateLimit,
  RateLimitError,
  readClientIp,
} from "@/lib/rate-limit/rate-limit.server";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(request: NextRequest) {
  try {
    // Unauthenticated, accepts a 15MB attachment, and sends mail on the
    // platform's Resend quota — limited per IP before the body is even read.
    await enforceRateLimit({
      action: "migration-support",
      subject: readClientIp(request),
      limit: 3,
      windowMs: 60 * 60_000,
    });

    const form = await request.formData();
    const comment = String(form.get("comment") ?? "").trim();
    const contactEmail = String(form.get("email") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim() || "—";
    const file = form.get("file");

    if (!comment && !(file instanceof File)) {
      return NextResponse.json(
        { error: "Describe the problem or attach a file." },
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
          { error: "File is too large (max 15 MB)." },
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
    await sendEmail({
      from: getSupportFrom(),
      to: support,
      replyTo: contactEmail || undefined,
      subject: `Помощь с импортом — ${companyName}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfterSec: error.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    console.error("[migration/support]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send the request" },
      { status: 500 },
    );
  }
}
