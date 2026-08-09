import "server-only";

import { escapeHtml } from "@/lib/email/templates/html";
import {
  EMAIL_FONT_STACK,
  EMAIL_MAX_WIDTH,
  emailMasthead,
  emailPalette,
} from "@/lib/email/templates/theme";
import {
  DEFAULT_MARKETING_ORIGIN,
  getMarketingUrl,
  getPublicAppUrl,
  getUrlHost,
  isLocalDevHost,
} from "@/lib/site-urls";

const light = emailPalette.light;
const dark = emailPalette.dark;

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_AUTOCORE_SUPPORT_EMAIL?.trim() || "support@myautocore.com";

const PRODUCT_TAGLINE = "Operations platform for engine sellers, dismantlers and parts warehouses.";

export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

export type EmailCta = {
  label: string;
  url: string;
  /** Shown under the button; the raw URL is printed automatically. */
  hint?: string;
};

export type EmailLayoutOptions = {
  /** Inbox preview line. Keep under ~90 characters. */
  previewText: string;
  /** Small badge in the masthead, e.g. "Account security". */
  eyebrow?: string;
  title: string;
  /** Optional single sentence directly under the title. */
  lede?: string;
  bodyHtml: string;
  cta?: EmailCta;
  /** Closing line inside the card, above the footer. */
  footerNote?: string;
  /** Rendered as "This message was sent to …" so the recipient can spot a wrong address. */
  recipientEmail?: string | null;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * A mail sent from a dev or preview build still lands in a real inbox, so the footer
 * must never advertise `localhost`. `getPublicAppUrl()` already guards the app origin;
 * this is the same guard for the marketing origin.
 */
function publicMarketingUrl(): string {
  const url = getMarketingUrl();
  const host = getUrlHost(url);
  return host && isLocalDevHost(host) ? DEFAULT_MARKETING_ORIGIN : url;
}

function displayUrl(value: string): string {
  return trimTrailingSlash(value).replace(/^https?:\/\//, "");
}

/**
 * Gmail and most clients honour a hidden preheader, but they then keep pulling visible copy
 * into the preview until the line is full. The zero-width padding stops that.
 */
function buildPreheader(previewText: string): string {
  const padding = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(previewText)}${padding}</div>`;
}

function buildStyles(): string {
  return `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin:0 !important; padding:0 !important; width:100% !important; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    /* iOS/Android auto-linking recolours plain text — force it back to our tokens. */
    a[x-apple-data-detectors], .unstyle-auto-detected-links a, .aBn {
      color:inherit !important; text-decoration:none !important; font-size:inherit !important;
      font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important;
      border-bottom:0 !important;
    }

    @media only screen and (max-width:620px) {
      .ac-shell { padding:20px 10px !important; }
      .ac-pad { padding-left:24px !important; padding-right:24px !important; }
      .ac-pad-top { padding-top:28px !important; }
      .ac-title { font-size:23px !important; line-height:1.24 !important; }
      .ac-code { font-size:30px !important; letter-spacing:0.16em !important; }
      .ac-code-pad { padding:22px 12px !important; }
      .ac-btn-table { width:100% !important; }
      .ac-btn { display:block !important; text-align:center !important; }
    }

    @media (prefers-color-scheme: dark) {
      .ac-page { background-color:${dark.page} !important; }
      .ac-card, .ac-surface { background-color:${dark.surface} !important; border-color:${dark.border} !important; }
      .ac-panel { background-color:${dark.panel} !important; border-color:${dark.border} !important; }
      .ac-primary-panel { background-color:${dark.primaryPanel} !important; border-color:${dark.primaryBorder} !important; }
      .ac-code-chip { background-color:${dark.surface} !important; border-color:${dark.primaryBorder} !important; }
      .ac-notice { background-color:${dark.warningPanel} !important; border-color:${dark.warningBorder} !important; }
      .ac-notice-text { color:${dark.warningText} !important; }
      .ac-title, .ac-text, .ac-code, .ac-strong { color:${dark.text} !important; }
      .ac-muted { color:${dark.muted} !important; }
      .ac-faint { color:${dark.faint} !important; }
      .ac-link { color:${dark.primaryLink} !important; }
      .ac-footer { background-color:${dark.page} !important; border-color:${dark.border} !important; }
      .ac-rule { background-color:${dark.border} !important; }
      .ac-btn-cell { background-color:${dark.primary} !important; }
      .ac-btn { color:${dark.primaryForeground} !important; }
    }

    /* Outlook.com dark mode rewrites styles behind these attributes. */
    [data-ogsc] .ac-page { background-color:${dark.page} !important; }
    [data-ogsc] .ac-card, [data-ogsc] .ac-surface { background-color:${dark.surface} !important; border-color:${dark.border} !important; }
    [data-ogsc] .ac-panel { background-color:${dark.panel} !important; border-color:${dark.border} !important; }
    [data-ogsc] .ac-primary-panel { background-color:${dark.primaryPanel} !important; border-color:${dark.primaryBorder} !important; }
    [data-ogsc] .ac-code-chip { background-color:${dark.surface} !important; border-color:${dark.primaryBorder} !important; }
    [data-ogsc] .ac-notice { background-color:${dark.warningPanel} !important; border-color:${dark.warningBorder} !important; }
    [data-ogsc] .ac-notice-text { color:${dark.warningText} !important; }
    [data-ogsc] .ac-title, [data-ogsc] .ac-text, [data-ogsc] .ac-code, [data-ogsc] .ac-strong { color:${dark.text} !important; }
    [data-ogsc] .ac-muted { color:${dark.muted} !important; }
    [data-ogsc] .ac-faint { color:${dark.faint} !important; }
    [data-ogsc] .ac-link { color:${dark.primaryLink} !important; }
    [data-ogsc] .ac-footer { background-color:${dark.page} !important; border-color:${dark.border} !important; }
    [data-ogsc] .ac-rule { background-color:${dark.border} !important; }
  `;
}

/**
 * The mark is a hosted PNG baked onto the masthead colour (see
 * `scripts/email/build-logo-asset.mjs`). `EMAIL_LOGO_URL` lets a caller swap in a `cid:`
 * reference when the message carries the mark as an inline attachment instead.
 */
function logoUrl(): string {
  const override = process.env.EMAIL_LOGO_URL?.trim();
  if (override) return override;
  return `${trimTrailingSlash(publicMarketingUrl())}/email/autocore-mark.png`;
}

function buildMasthead(eyebrow: string | undefined): string {
  const badge = eyebrow
    ? `<td align="right" style="vertical-align:middle;">
         <span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:${emailMasthead.badgeBackground};color:${emailMasthead.badgeText};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">${escapeHtml(eyebrow)}</span>
       </td>`
    : "";

  return `
    <tr>
      <td class="ac-pad" bgcolor="${emailMasthead.background}" style="padding:26px 40px;background-color:${emailMasthead.background};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;width:1%;padding-right:12px;">
              <!-- Decorative: the wordmark beside it carries the name, including when images are blocked. -->
              <img src="${escapeHtml(logoUrl())}" width="36" height="36" alt=""
                   style="display:block;width:36px;height:36px;border:0;outline:none;text-decoration:none;background-color:${emailMasthead.background};" />
            </td>
            <td style="vertical-align:middle;">
              <span style="display:block;color:${emailMasthead.text};font-family:${EMAIL_FONT_STACK};font-size:17px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">AutoCore</span>
            </td>
            ${badge}
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildCta(cta: EmailCta): string {
  const url = escapeHtml(cta.url);
  const label = escapeHtml(cta.label);
  const hint = cta.hint
    ? `<p class="ac-muted" style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${light.muted};">${escapeHtml(cta.hint)}</p>`
    : "";

  return `
    <table role="presentation" class="ac-btn-table" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
      <tr>
        <td class="ac-btn-cell" align="center" bgcolor="${light.primary}" style="border-radius:12px;background-color:${light.primary};">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
            href="${url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="25%" stroke="f" fillcolor="${light.primary}">
            <w:anchorlock/>
            <center style="color:${light.primaryForeground};font-family:${EMAIL_FONT_STACK};font-size:15px;font-weight:700;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a class="ac-btn" href="${url}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:15px 30px;font-family:${EMAIL_FONT_STACK};font-size:15px;font-weight:700;line-height:1;color:${light.primaryForeground};text-decoration:none;letter-spacing:-0.01em;border-radius:12px;">${label}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
    ${hint}
    <p class="ac-faint" style="margin:12px 0 0;font-size:12px;line-height:1.6;color:${light.faint};word-break:break-all;">
      Or paste this link into your browser:<br />
      <a class="ac-link" href="${url}" target="_blank" rel="noopener noreferrer" style="color:${light.primaryLink};text-decoration:underline;">${url}</a>
    </p>`;
}

function buildFooter(recipientEmail: string | null | undefined): string {
  const appUrl = trimTrailingSlash(getPublicAppUrl());
  const marketingUrl = trimTrailingSlash(publicMarketingUrl());
  const recipientLine = recipientEmail
    ? `<p class="ac-faint" style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${light.faint};">
         This message was sent to <span class="ac-muted" style="color:${light.muted};">${escapeHtml(recipientEmail)}</span>.
       </p>`
    : "";

  return `
    <tr>
      <td class="ac-footer ac-pad" bgcolor="${light.page}" style="padding:24px 40px 30px;background-color:${light.page};border-top:1px solid ${light.border};">
        <p class="ac-muted" style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${light.muted};">
          Need a hand? Reply to this email or write to
          <a class="ac-link" href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${light.primaryLink};text-decoration:none;font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>.
        </p>
        ${recipientLine}
        <p class="ac-faint" style="margin:12px 0 0;font-size:12px;line-height:1.6;color:${light.faint};">
          <a class="ac-faint" href="${escapeHtml(marketingUrl)}" target="_blank" rel="noopener noreferrer" style="color:${light.faint};text-decoration:none;">${escapeHtml(displayUrl(marketingUrl))}</a>
          <span style="padding:0 6px;">&middot;</span>
          <a class="ac-faint" href="${escapeHtml(appUrl)}" target="_blank" rel="noopener noreferrer" style="color:${light.faint};text-decoration:none;">${escapeHtml(displayUrl(appUrl))}</a>
        </p>
        <p class="ac-faint" style="margin:6px 0 0;font-size:11px;line-height:1.6;color:${light.faint};">
          AutoCore &middot; ${PRODUCT_TAGLINE}
        </p>
      </td>
    </tr>`;
}

export function buildEmailLayout(options: EmailLayoutOptions): string {
  const title = escapeHtml(options.title);
  const lede = options.lede
    ? `<p class="ac-muted" style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${light.muted};">${escapeHtml(options.lede)}</p>`
    : "";
  const cta = options.cta ? buildCta(options.cta) : "";
  const footerNote = options.footerNote
    ? `<p class="ac-faint" style="margin:28px 0 0;font-size:12px;line-height:1.65;color:${light.faint};">${escapeHtml(options.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <![endif]-->
    <style type="text/css">${buildStyles()}</style>
  </head>
  <body class="ac-page" bgcolor="${light.page}" style="margin:0;padding:0;background-color:${light.page};font-family:${EMAIL_FONT_STACK};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    ${buildPreheader(options.previewText)}
    <table role="presentation" class="ac-page" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${light.page}" style="background-color:${light.page};">
      <tr>
        <td class="ac-shell" align="center" style="padding:40px 16px;">
          <table role="presentation" class="ac-card" width="${EMAIL_MAX_WIDTH}" cellspacing="0" cellpadding="0" border="0" bgcolor="${light.surface}"
                 style="width:100%;max-width:${EMAIL_MAX_WIDTH}px;background-color:${light.surface};border:1px solid ${light.border};border-radius:18px;overflow:hidden;">
            ${buildMasthead(options.eyebrow)}
            <tr>
              <td class="ac-surface ac-pad ac-pad-top" bgcolor="${light.surface}" style="padding:36px 40px 8px;background-color:${light.surface};">
                <h1 class="ac-title" style="margin:0 0 12px;font-family:${EMAIL_FONT_STACK};font-size:26px;line-height:1.22;font-weight:800;letter-spacing:-0.03em;color:${light.text};">${title}</h1>
                ${lede}
              </td>
            </tr>
            <tr>
              <td class="ac-surface ac-pad ac-text" bgcolor="${light.surface}" style="padding:0 40px 36px;background-color:${light.surface};font-family:${EMAIL_FONT_STACK};font-size:15px;line-height:1.65;color:${light.text};">
                ${options.bodyHtml}
                ${cta}
                ${footerNote}
              </td>
            </tr>
            ${buildFooter(options.recipientEmail)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type EmailTextOptions = {
  title: string;
  /** Body lines; `null` becomes a blank line. */
  lines: Array<string | null>;
  cta?: EmailCta;
  footerNote?: string;
};

/**
 * Plain-text alternative. Sent alongside every HTML mail: it is what filters score for
 * spam, what screen readers fall back to, and what shows in text-only clients.
 */
export function buildEmailText(options: EmailTextOptions): string {
  const parts: string[] = ["AutoCore", "", options.title, "─".repeat(Math.min(options.title.length, 46)), ""];

  for (const line of options.lines) {
    parts.push(line ?? "");
  }

  if (options.cta) {
    parts.push("", options.cta.label.toUpperCase() + ":", options.cta.url);
    if (options.cta.hint) parts.push(options.cta.hint);
  }

  if (options.footerNote) {
    parts.push("", options.footerNote);
  }

  parts.push(
    "",
    "—",
    `Questions? Write to ${SUPPORT_EMAIL}`,
    trimTrailingSlash(publicMarketingUrl()),
    `AutoCore · ${PRODUCT_TAGLINE}`,
  );

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
