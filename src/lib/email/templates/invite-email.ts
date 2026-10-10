import "server-only";

import { detailPanel, featureStrip, paragraph } from "@/lib/email/templates/blocks";
import { escapeHtml } from "@/lib/email/templates/html";
import { buildEmailLayout, buildEmailText, type EmailMessage } from "@/lib/email/templates/layout";
import { WORKSPACE_MODULES } from "@/lib/email/templates/verification-email";

export type InviteEmailParams = {
  joinUrl: string;
  companyName: string;
  role: string;
  expiresAt: Date;
  invitedByName?: string | null;
  recipientEmail?: string | null;
  /** Same invite as the link, typed into "Join with a code" in the app. */
  inviteCode?: string | null;
};

/** Display labels only — the stored role value is the untranslated key. */
function formatRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return role;
  }
}

/**
 * Formatted in UTC and labelled as such: the sender runs on a UTC server, so a bare
 * local-looking timestamp would be wrong for most recipients.
 */
function formatExpiry(expiresAt: Date): string {
  const formatted = expiresAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}

export function buildInviteEmail(params: InviteEmailParams): EmailMessage {
  const expiryLabel = formatExpiry(params.expiresAt);
  const roleLabel = formatRoleLabel(params.role);
  const invitedBy = params.invitedByName?.trim();

  const rows = [
    { label: "Company", value: params.companyName },
    { label: "Your role", value: roleLabel },
    { label: "Invitation valid until", value: expiryLabel },
  ];
  if (invitedBy) {
    rows.splice(1, 0, { label: "Invited by", value: invitedBy });
  }
  const inviteCode = params.inviteCode?.trim();
  if (inviteCode) {
    rows.push({ label: "Invite code", value: inviteCode });
  }

  const intro = invitedBy
    ? `${escapeHtml(invitedBy)} invited you to join <strong class="ac-strong" style="font-weight:700;">${escapeHtml(params.companyName)}</strong> on AutoCore.`
    : `You've been invited to join <strong class="ac-strong" style="font-weight:700;">${escapeHtml(params.companyName)}</strong> on AutoCore.`;

  const bodyHtml = [
    paragraph(intro, { marginBottom: 20 }),
    detailPanel(rows),
    featureStrip({ label: "What you'll get access to", items: WORKSPACE_MODULES }),
  ].join("");

  return {
    subject: `${params.companyName} invited you to AutoCore`,
    html: buildEmailLayout({
      previewText: `Join ${params.companyName} on AutoCore as ${roleLabel.toLowerCase()}.`,
      eyebrow: "Team invitation",
      title: `Join ${params.companyName}`,
      bodyHtml,
      cta: {
        label: "Accept invitation",
        url: params.joinUrl,
      },
      footerNote: `The invitation expires on ${expiryLabel}. If you weren't expecting it, you can ignore this message.`,
      recipientEmail: params.recipientEmail,
    }),
    text: buildEmailText({
      title: `Join ${params.companyName}`,
      lines: [
        invitedBy
          ? `${invitedBy} invited you to join ${params.companyName} on AutoCore.`
          : `You've been invited to join ${params.companyName} on AutoCore.`,
        "",
        ...rows.map((row) => `${row.label}: ${row.value}`),
        "",
        `What you'll get access to: ${WORKSPACE_MODULES.join(", ")}.`,
      ],
      cta: { label: "Accept invitation", url: params.joinUrl },
      footerNote: `The invitation expires on ${expiryLabel}. If you weren't expecting it, you can ignore this message.`,
    }),
  };
}

export function buildInviteEmailSubject(companyName: string): string {
  return `${companyName} invited you to AutoCore`;
}
