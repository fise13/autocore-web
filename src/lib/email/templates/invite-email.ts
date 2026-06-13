import "server-only";

import { buildEmailLayout } from "@/lib/email/templates/layout";

export type InviteEmailParams = {
  joinUrl: string;
  companyName: string;
  role: string;
  expiresAt: Date;
};

function formatRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Администратор";
    case "manager":
      return "Менеджер";
    case "employee":
      return "Сотрудник";
    default:
      return role;
  }
}

export function buildInviteEmailHtml(params: InviteEmailParams): string {
  const expiresLabel = params.expiresAt.toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const bodyHtml = `
    <p style="margin:0 0 12px;">Вас пригласили в команду <strong>${params.companyName}</strong> в AutoCore.</p>
    <p style="margin:0 0 12px;">Роль: <strong>${formatRoleLabel(params.role)}</strong></p>
    <p style="margin:0;color:#6e7480;font-size:14px;">Ссылка действует до ${expiresLabel}.</p>`;

  return buildEmailLayout({
    previewText: `Приглашение в ${params.companyName} — AutoCore`,
    title: "Приглашение в команду",
    bodyHtml,
    ctaLabel: "Принять приглашение",
    ctaUrl: params.joinUrl,
  });
}

export function buildInviteEmailSubject(companyName: string): string {
  return `Приглашение в ${companyName} — AutoCore`;
}
