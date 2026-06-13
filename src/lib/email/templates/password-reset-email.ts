import "server-only";

import { buildEmailLayout } from "@/lib/email/templates/layout";

export type PasswordResetEmailParams = {
  resetUrl: string;
  userName?: string | null;
};

export function buildPasswordResetEmailHtml(params: PasswordResetEmailParams): string {
  const greeting = params.userName?.trim()
    ? `Здравствуйте, ${params.userName.trim()}!`
    : "Здравствуйте!";

  const bodyHtml = `
    <p style="margin:0 0 12px;">${greeting}</p>
    <p style="margin:0 0 12px;">
      Мы получили запрос на сброс пароля для вашего аккаунта AutoCore. Нажмите кнопку ниже, чтобы задать новый пароль.
    </p>
    <p style="margin:0;color:#6e7480;font-size:14px;">
      Если вы не запрашивали сброс, ничего делать не нужно — пароль останется прежним.
    </p>`;

  return buildEmailLayout({
    previewText: "Сброс пароля AutoCore",
    title: "Сброс пароля",
    bodyHtml,
    ctaLabel: "Задать новый пароль",
    ctaUrl: params.resetUrl,
    footerNote: "Ссылка одноразовая и действует ограниченное время.",
  });
}

export const PASSWORD_RESET_EMAIL_SUBJECT = "Сброс пароля — AutoCore";
