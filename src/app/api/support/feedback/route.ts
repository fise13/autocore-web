import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { escapeHtml, escapeHtmlParagraph } from "@/lib/email/escape-html";
import { sendEmail, getSupportFrom, isResendConfigured } from "@/lib/email/resend-client";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/rate-limit/rate-limit.server";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SUBJECT_MAX,
  feedbackKindLabel,
  type FeedbackKind,
} from "@/lib/support/feedback-contract";

export const runtime = "nodejs";

/**
 * In-product feedback from the Help workspace.
 *
 * Signed-in only, unlike the migration support endpoint. Help lives behind the
 * dashboard, so the token is already there — and taking it means the identity
 * on the report is *verified* rather than typed. A person cannot file a bug as
 * somebody else's company, and the rate limit binds to a real account instead
 * of to an IP that a phone changes every time it moves between towers.
 */
const payloadSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  subject: z.string().trim().max(FEEDBACK_SUBJECT_MAX).optional().default(""),
  message: z.string().trim().min(FEEDBACK_MESSAGE_MIN).max(FEEDBACK_MESSAGE_MAX),
  /** Where to write back. Defaults to the account address when left blank. */
  replyTo: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
  /** The page the report was written from. */
  pageUrl: z.string().trim().max(500).optional().default(""),
  /** Browser, OS and viewport — what a "works for me" reply usually turns on. */
  client: z.string().trim().max(400).optional().default(""),
});

type ReporterContext = {
  uid: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
};

/**
 * Who is reporting, read from Firestore rather than from the request body.
 *
 * The form does carry a reply-to address, because a person may want the answer
 * somewhere other than their account. Everything else — the account, the
 * company, the role — is looked up, so no field on this report can be spoofed
 * by editing the request.
 */
async function loadReporter(uid: string): Promise<ReporterContext> {
  const db = getAdminFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  const user = (userSnap.data() ?? {}) as Record<string, unknown>;

  const readString = (...keys: string[]): string => {
    for (const key of keys) {
      const value = user[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  const companyId = readString("companyId");
  let companyName = "";
  if (companyId) {
    const companySnap = await db.collection("companies").doc(companyId).get();
    const name = companySnap.data()?.name;
    if (typeof name === "string") companyName = name.trim();
  }

  return {
    uid,
    name: readString("fullName", "displayName", "name") || "—",
    email: readString("email"),
    role: readString("role") || "—",
    companyId: companyId || "—",
    companyName: companyName || (companyId ? companyId : "—"),
  };
}

function renderHtml(input: {
  kind: FeedbackKind;
  subject: string;
  message: string;
  replyTo: string;
  pageUrl: string;
  client: string;
  reporter: ReporterContext;
  attachmentName: string | null;
}): string {
  const rows: Array<[string, string]> = [
    ["From", `${input.reporter.name} (${input.reporter.email || "no account email"})`],
    ["Company", `${input.reporter.companyName} · ${input.reporter.companyId}`],
    ["Role", input.reporter.role],
    ["Reply to", input.replyTo || input.reporter.email || "—"],
    ["Page", input.pageUrl || "—"],
    ["Client", input.client || "—"],
    ["Account", input.reporter.uid],
  ];

  if (input.attachmentName) rows.push(["Attachment", input.attachmentName]);

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
        ${escapeHtml(feedbackKindLabel(input.kind))}
      </p>
      <h2 style="margin:0 0 16px;font-size:18px;line-height:1.3;">
        ${escapeHtml(input.subject || feedbackKindLabel(input.kind))}
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
    const { uid } = await verifyAccountAccess(request);

    // Sends mail on the platform's Resend quota and can carry an attachment.
    await enforceRateLimit({
      action: "support-feedback",
      subject: uid,
      limit: 5,
      windowMs: 60 * 60_000,
    });

    const form = await request.formData();
    const parsed = payloadSchema.safeParse({
      kind: form.get("kind") ?? undefined,
      subject: form.get("subject") ?? undefined,
      message: form.get("message") ?? undefined,
      replyTo: form.get("replyTo") ?? undefined,
      pageUrl: form.get("pageUrl") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.issues.map((issue) => issue.path.join(".")) },
        { status: 400 },
      );
    }

    const file = form.get("file");
    if (file instanceof File && file.size > FEEDBACK_MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "attachment_too_large" }, { status: 413 });
    }

    const recipient = getPlatformContacts().email;

    if (!isResendConfigured()) {
      // Surface the address so the form can fall back to the reader's own mail
      // client rather than swallowing what they just wrote.
      return NextResponse.json(
        { error: "email_not_configured", support: recipient },
        { status: 503 },
      );
    }

    const reporter = await loadReporter(uid);
    const { kind, subject, message, replyTo, pageUrl, client } = parsed.data;

    const attachments =
      file instanceof File
        ? [{ filename: file.name, content: Buffer.from(await file.arrayBuffer()) }]
        : undefined;

    const headline = subject || feedbackKindLabel(kind);

    await sendEmail({
      from: getSupportFrom(),
      to: recipient,
      replyTo: replyTo || reporter.email || undefined,
      subject: `${feedbackKindLabel(kind)} · ${reporter.companyName} — ${headline}`,
      html: renderHtml({
        kind,
        subject,
        message,
        replyTo,
        pageUrl,
        client,
        reporter,
        attachmentName: file instanceof File ? file.name : null,
      }),
      text: [
        `${feedbackKindLabel(kind)}: ${headline}`,
        "",
        `From: ${reporter.name} <${reporter.email || "—"}>`,
        `Company: ${reporter.companyName} (${reporter.companyId})`,
        `Role: ${reporter.role}`,
        `Reply to: ${replyTo || reporter.email || "—"}`,
        `Page: ${pageUrl || "—"}`,
        `Client: ${client || "—"}`,
        `Account: ${reporter.uid}`,
        "",
        message,
      ].join("\n"),
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: "unauthorized" }, { status: error.status });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSec: error.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    console.error("[support/feedback]", error);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}
