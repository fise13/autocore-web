import "server-only";

import { noticePanel, paragraph, strong } from "@/lib/email/templates/blocks";
import { buildEmailLayout, buildEmailText, type EmailMessage } from "@/lib/email/templates/layout";

export type PasswordResetEmailParams = {
  resetUrl: string;
  userName?: string | null;
  recipientEmail?: string | null;
};

const IGNORE_NOTICE = {
  heading: "Didn't ask for this?",
  body: "Ignore this email and your password stays exactly as it is. The link only works once, and nothing changes until it is opened.",
};

function greeting(userName?: string | null): string {
  const name = userName?.trim();
  return name ? `Hi ${name},` : "Hi,";
}

export function buildPasswordResetEmail(params: PasswordResetEmailParams): EmailMessage {
  const bodyHtml = [
    paragraph(`${strong(greeting(params.userName))} we received a request to reset the password for your AutoCore account.`),
    paragraph("Use the button below to choose a new one.", { marginBottom: 24 }),
    noticePanel(IGNORE_NOTICE),
  ].join("");

  return {
    subject: "Reset your AutoCore password",
    html: buildEmailLayout({
      previewText: "Choose a new password for your AutoCore account.",
      eyebrow: "Account security",
      title: "Reset your password",
      bodyHtml,
      cta: {
        label: "Choose a new password",
        url: params.resetUrl,
      },
      footerNote: "This link is single-use and expires after a short while.",
      recipientEmail: params.recipientEmail,
    }),
    text: buildEmailText({
      title: "Reset your password",
      lines: [
        greeting(params.userName),
        "",
        "We received a request to reset the password for your AutoCore account. Open the link below to choose a new one.",
        "",
        `${IGNORE_NOTICE.heading} ${IGNORE_NOTICE.body}`,
      ],
      cta: { label: "Choose a new password", url: params.resetUrl },
      footerNote: "This link is single-use and expires after a short while.",
    }),
  };
}

export const PASSWORD_RESET_EMAIL_SUBJECT = "Reset your AutoCore password";
