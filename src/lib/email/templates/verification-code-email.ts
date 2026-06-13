import "server-only";

import { buildEmailLayout } from "@/lib/email/templates/layout";
import { VERIFICATION_CODE_TTL_MINUTES } from "@/lib/email/verification-code.server";

export type VerificationCodeEmailParams = {
  code: string;
  userName?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildVerificationCodeEmailHtml(params: VerificationCodeEmailParams): string {
  const greeting = params.userName?.trim()
    ? `Здравствуйте, ${escapeHtml(params.userName.trim())}!`
    : "Здравствуйте!";
  const code = escapeHtml(params.code);

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#11131a !important;">${greeting}</p>
    <p style="margin:0 0 24px;color:#11131a !important;">
      Введите код ниже в AutoCore, чтобы подтвердить email и открыть рабочее пространство.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="padding:24px 16px;border-radius:16px;background:#f5f8fd;border:1px solid #e8ecf2;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5c6370 !important;">
            Код подтверждения
          </p>
          <p style="margin:0;font-size:40px;line-height:1;font-weight:800;letter-spacing:0.28em;color:#11131a !important;font-family:'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
            ${code}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#11131a !important;">
      Моторы · Склад · Заказ-наряды · Бухгалтерия
    </p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#5c6370 !important;">
      Код действует ${VERIFICATION_CODE_TTL_MINUTES} минут. Если вы не регистрировались в AutoCore, просто проигнорируйте это письмо.
    </p>`;

  return buildEmailLayout({
    previewText: `Код подтверждения AutoCore: ${params.code}`,
    eyebrow: "Подтверждение аккаунта",
    title: "Код для подтверждения email",
    bodyHtml,
    footerNote: "Код вводится прямо в приложении — ссылку открывать не нужно.",
  });
}

export const VERIFICATION_EMAIL_SUBJECT = "Код подтверждения — AutoCore";
