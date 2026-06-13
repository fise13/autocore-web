import "server-only";

import { buildEmailLayout } from "@/lib/email/templates/layout";

export type VerificationEmailParams = {
  verifyUrl: string;
  userName?: string | null;
};

export function buildVerificationEmailHtml(params: VerificationEmailParams): string {
  const greeting = params.userName?.trim()
    ? `Здравствуйте, ${params.userName.trim()}!`
    : "Здравствуйте!";

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#11131a !important;">${greeting}</p>
    <p style="margin:0 0 20px;color:#11131a !important;">
      Остался один шаг — подтвердите email, чтобы открыть рабочее пространство AutoCore.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;width:100%;">
      <tr>
        <td style="padding:14px 16px;border-radius:12px;background:#f5f8fd;border:1px solid #e8ecf2;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#5c6370 !important;">После подтверждения</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#11131a !important;">
            Моторы · Склад · Заказ-наряды · Бухгалтерия
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#5c6370 !important;">
      Ссылка действует ограниченное время. Если вы не регистрировались в AutoCore, просто проигнорируйте это письмо.
    </p>`;

  return buildEmailLayout({
    previewText: "Подтвердите email для доступа к AutoCore",
    eyebrow: "Подтверждение аккаунта",
    title: "Подтвердите email",
    bodyHtml,
    ctaLabel: "Подтвердить email",
    ctaUrl: params.verifyUrl,
    footerNote: "После подтверждения вернитесь в приложение и нажмите «Я подтвердил email».",
  });
}

export const VERIFICATION_EMAIL_SUBJECT = "Подтвердите email — AutoCore";
