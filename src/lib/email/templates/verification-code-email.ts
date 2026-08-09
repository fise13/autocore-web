import "server-only";

import { codePanel, noticePanel, paragraph, strong } from "@/lib/email/templates/blocks";
import { buildEmailLayout, buildEmailText, type EmailMessage } from "@/lib/email/templates/layout";
import { VERIFICATION_CODE_TTL_MINUTES } from "@/lib/email/verification-code.server";

export type VerificationCodeEmailParams = {
  code: string;
  userName?: string | null;
  /** Shown in the footer so a wrong-address delivery is obvious. */
  recipientEmail?: string | null;
};

const NEVER_SHARE_NOTE =
  "AutoCore will never ask you for this code by phone, chat or email. If someone does, it is not us.";

function greeting(userName?: string | null): string {
  const name = userName?.trim();
  return name ? `Hi ${name},` : "Hi,";
}

export function buildVerificationCodeEmail(params: VerificationCodeEmailParams): EmailMessage {
  const expiry = `This code expires in ${VERIFICATION_CODE_TTL_MINUTES} minutes.`;

  const bodyHtml = [
    paragraph(`${strong(greeting(params.userName))} enter the code below in AutoCore to confirm your email address and open your workspace.`),
    codePanel({
      code: params.code,
      label: "Verification code",
      caption: expiry,
    }),
    noticePanel({
      heading: "Didn't request this?",
      body: "Someone may have mistyped their email address. You can ignore this message — nothing changes until the code is entered, and no one can use it without access to this inbox.",
    }),
  ].join("");

  return {
    subject: `${params.code} is your AutoCore verification code`,
    html: buildEmailLayout({
      previewText: `${params.code} — your AutoCore verification code. ${expiry}`,
      eyebrow: "Account security",
      title: "Confirm your email address",
      bodyHtml,
      footerNote: NEVER_SHARE_NOTE,
      recipientEmail: params.recipientEmail,
    }),
    text: buildEmailText({
      title: "Confirm your email address",
      lines: [
        greeting(params.userName),
        "",
        "Enter this code in AutoCore to confirm your email address and open your workspace.",
        "",
        `    ${params.code}`,
        "",
        expiry,
        "",
        "Didn't request this? Someone may have mistyped their email address. You can ignore this message — nothing changes until the code is entered.",
      ],
      footerNote: NEVER_SHARE_NOTE,
    }),
  };
}

/** Static fallback for callers that need a subject before the code is generated. */
export const VERIFICATION_CODE_EMAIL_SUBJECT = "Your AutoCore verification code";
