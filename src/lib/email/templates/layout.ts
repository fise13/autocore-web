import "server-only";

import { getAppUrl } from "@/lib/site-urls";

const BRAND_PRIMARY = "#0a73f2";
const BRAND_PRIMARY_DARK = "#0860cc";
const BRAND_TEXT = "#11131a";
const BRAND_MUTED = "#5c6370";
const BRAND_BORDER = "#e8ecf2";
const BRAND_SURFACE = "#ffffff";
const BRAND_PAGE = "#f3f6fb";
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_AUTOCORE_SUPPORT_EMAIL?.trim() || "support@myautocore.com";

export type EmailLayoutOptions = {
  previewText: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  eyebrow?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildEmailLayout(options: EmailLayoutOptions): string {
  const title = escapeHtml(options.title);
  const preview = escapeHtml(options.previewText);
  const eyebrow = options.eyebrow ? escapeHtml(options.eyebrow) : "AutoCore";
  const appUrl = escapeHtml(getAppUrl().replace(/\/$/, ""));
  const footerNote = options.footerNote
    ? `<p class="email-muted" style="margin:28px 0 0;font-size:13px;line-height:1.55;color:${BRAND_MUTED} !important;">${escapeHtml(options.footerNote)}</p>`
    : "";

  const ctaUrl = options.ctaUrl ? escapeHtml(options.ctaUrl) : "";
  const cta =
    options.ctaLabel && options.ctaUrl
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 0;">
          <tr>
            <td align="center" style="border-radius:12px;background:${BRAND_PRIMARY};box-shadow:0 10px 24px rgba(10,115,242,0.28);">
              <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" class="email-cta"
                style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;letter-spacing:-0.01em;">
                ${escapeHtml(options.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
        <p class="email-muted" style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${BRAND_MUTED} !important;">
          Кнопка не открывается?
          <a href="${ctaUrl}" style="color:${BRAND_PRIMARY} !important;text-decoration:underline;">Открыть подтверждение в браузере</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light only; supported-color-schemes: light; }
      @media (prefers-color-scheme: dark) {
        .email-page, .email-card, .email-body, .email-footer { background-color: ${BRAND_SURFACE} !important; }
        .email-page-wrap { background-color: ${BRAND_PAGE} !important; }
        .email-title, .email-text, .email-cta { color: inherit !important; }
        .email-muted { color: ${BRAND_MUTED} !important; }
      }
    </style>
  </head>
  <body class="email-page-wrap" bgcolor="${BRAND_PAGE}" style="margin:0;padding:0;background-color:${BRAND_PAGE} !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-page-wrap" bgcolor="${BRAND_PAGE}" style="background-color:${BRAND_PAGE} !important;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" bgcolor="${BRAND_SURFACE}" style="max-width:520px;background-color:${BRAND_SURFACE} !important;border:1px solid ${BRAND_BORDER};border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(17,19,26,0.08);">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,${BRAND_PRIMARY},#4d9bff);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-body" bgcolor="${BRAND_SURFACE}" style="padding:36px 36px 8px;background-color:${BRAND_SURFACE} !important;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,${BRAND_PRIMARY},#4d9bff);text-align:center;line-height:40px;">
                        <span style="color:#ffffff;font-size:17px;font-weight:800;letter-spacing:-0.03em;">A</span>
                      </div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div class="email-text" style="font-size:17px;font-weight:700;color:${BRAND_TEXT} !important;letter-spacing:-0.02em;">AutoCore</div>
                      <div class="email-muted" style="font-size:12px;color:${BRAND_MUTED} !important;margin-top:2px;">${eyebrow}</div>
                    </td>
                  </tr>
                </table>
                <h1 class="email-title" style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:800;color:${BRAND_TEXT} !important;letter-spacing:-0.03em;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td class="email-body email-text" bgcolor="${BRAND_SURFACE}" style="padding:0 36px 36px;color:${BRAND_TEXT} !important;font-size:15px;line-height:1.7;background-color:${BRAND_SURFACE} !important;">
                ${options.bodyHtml}
                ${cta}
                ${footerNote}
              </td>
            </tr>
            <tr>
              <td class="email-footer" bgcolor="#f8fafd" style="padding:22px 36px 28px;border-top:1px solid ${BRAND_BORDER};background-color:#f8fafd !important;">
                <p class="email-muted" style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND_MUTED} !important;">
                  Вопросы? Напишите на
                  <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${BRAND_PRIMARY_DARK} !important;text-decoration:none;font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>
                </p>
                <p class="email-muted" style="margin:0;font-size:11px;line-height:1.5;color:#9aa3b2 !important;">
                  <a href="${appUrl}" style="color:#9aa3b2 !important;text-decoration:none;">${appUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
