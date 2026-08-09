import "server-only";

import { featureStrip, paragraph, strong } from "@/lib/email/templates/blocks";
import { buildEmailLayout, buildEmailText, type EmailMessage } from "@/lib/email/templates/layout";

export type VerificationEmailParams = {
  verifyUrl: string;
  userName?: string | null;
  recipientEmail?: string | null;
};

export const WORKSPACE_MODULES = [
  "Motors",
  "Warehouse",
  "Work orders",
  "Accounting",
] as const;

function greeting(userName?: string | null): string {
  const name = userName?.trim();
  return name ? `Hi ${name},` : "Hi,";
}

export function buildVerificationEmail(params: VerificationEmailParams): EmailMessage {
  const bodyHtml = [
    paragraph(`${strong(greeting(params.userName))} one step left — confirm your email address to open your AutoCore workspace.`),
    featureStrip({ label: "Unlocked after confirming", items: WORKSPACE_MODULES }),
    paragraph(
      "The link works once and expires after a short while. If it has already expired, request a new one from the app.",
      { tone: "muted", marginBottom: 0 },
    ),
  ].join("");

  return {
    subject: "Confirm your email — AutoCore",
    html: buildEmailLayout({
      previewText: "Confirm your email address to open your AutoCore workspace.",
      eyebrow: "Account setup",
      title: "Confirm your email address",
      bodyHtml,
      cta: {
        label: "Confirm email address",
        url: params.verifyUrl,
      },
      footerNote:
        "If you didn't create an AutoCore account, you can safely ignore this message — the address stays unconfirmed.",
      recipientEmail: params.recipientEmail,
    }),
    text: buildEmailText({
      title: "Confirm your email address",
      lines: [
        greeting(params.userName),
        "",
        "One step left — confirm your email address to open your AutoCore workspace.",
        "",
        `Unlocked after confirming: ${WORKSPACE_MODULES.join(", ")}.`,
        "",
        "The link works once and expires after a short while. If it has already expired, request a new one from the app.",
      ],
      cta: { label: "Confirm email address", url: params.verifyUrl },
      footerNote:
        "If you didn't create an AutoCore account, you can safely ignore this message — the address stays unconfirmed.",
    }),
  };
}

export const VERIFICATION_EMAIL_SUBJECT = "Confirm your email — AutoCore";
