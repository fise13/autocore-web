import { NextRequest, NextResponse } from "next/server";

import { escapeHtml, escapeHtmlParagraph } from "@/lib/email/escape-html";
import { getResend, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import {
  contactIntentLabel,
  parseContactPayload,
  type ContactPayload,
} from "@/lib/marketing/contact-contract";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import {
  enforceRateLimit,
  RateLimitError,
  readClientIp,
} from "@/lib/rate-limit/rate-limit.server";

export const runtime = "nodejs";

function renderHtml(input: ContactPayload): string {
  const rows: Array<[string, string]> = [
    ["From", `${input.name} <${input.email}>`],
    ["Company", input.company || "-"],
    ["Intent", contactIntentLabel(input.intent)],
  ];

  const cells = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:4px 16px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;color:#111827;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.55;color:#111827;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;letter-spacing:.06em;text-transform:uppercase;">
        ${escapeHtml(contactIntentLabel(input.intent))}
      </p>
      <h2 style="margin:0 0 16px;font-size:18px;line-height:1.3;">
        Marketing contact
      </h2>
      <table style="border-collapse:collapse;margin:0 0 20px;font-size:13px;">${cells}</table>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;white-space:pre-wrap;">
        ${escapeHtmlParagraph(input.message)}
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit({
      action: "marketing-contact",
      subject: readClientIp(request),
      limit: 5,
      windowMs: 60 * 60_000,
    });

    const parsed = parseContactPayload(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.issues.map((issue) => issue.path.join(".")) },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    if (payload.website.trim()) {
      return NextResponse.json({ ok: true });
    }

    const recipient = getPlatformContacts().email;
    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: "email_not_configured", support: recipient },
        { status: 503 },
      );
    }

    const who = payload.company || payload.name;
    const headline = contactIntentLabel(payload.intent);

    await getResend().emails.send({
      from: getSupportFrom(),
      to: recipient,
      replyTo: payload.email,
      subject: `${headline} · ${who}`,
      html: renderHtml(payload),
      text: [
        `${headline}: ${who}`,
        "",
        `From: ${payload.name} <${payload.email}>`,
        `Company: ${payload.company || "-"}`,
        "",
        payload.message,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSec: error.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    console.error("[marketing/contact]", error);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}
