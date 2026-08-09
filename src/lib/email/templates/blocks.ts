import "server-only";

import { escapeHtml } from "@/lib/email/templates/html";
import { EMAIL_FONT_STACK, EMAIL_MONO_STACK, emailPalette } from "@/lib/email/templates/theme";

const c = emailPalette.light;

type ParagraphTone = "body" | "muted" | "faint";

const PARAGRAPH_TONE: Record<ParagraphTone, { className: string; color: string; size: string }> = {
  body: { className: "ac-text", color: c.text, size: "15px" },
  muted: { className: "ac-muted", color: c.muted, size: "14px" },
  faint: { className: "ac-faint", color: c.faint, size: "13px" },
};

/**
 * Paragraph. `html` is inserted verbatim so callers can add `<strong>`/links — every
 * dynamic value passed in must already be escaped (use `strong()` / `escapeHtml()`).
 */
export function paragraph(
  html: string,
  options: { tone?: ParagraphTone; marginBottom?: number } = {},
): string {
  const tone = PARAGRAPH_TONE[options.tone ?? "body"];
  const marginBottom = options.marginBottom ?? 16;
  return `<p class="${tone.className}" style="margin:0 0 ${marginBottom}px;font-family:${EMAIL_FONT_STACK};font-size:${tone.size};line-height:1.65;color:${tone.color};">${html}</p>`;
}

export function strong(value: string): string {
  return `<strong class="ac-strong" style="font-weight:700;color:${c.text};">${escapeHtml(value)}</strong>`;
}

/**
 * The one-time code.
 *
 * The digits are deliberately kept as one contiguous text node rather than split into
 * per-digit boxes: splitting them looks closer to the in-app input, but it breaks
 * copy-paste, screen-reader read-out, and iOS/macOS one-time-code autofill, which all
 * need the code as a single token.
 */
export function codePanel(params: { code: string; label: string; caption?: string }): string {
  const code = escapeHtml(params.code);
  const caption = params.caption
    ? `<p class="ac-muted" style="margin:14px 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:1.5;color:${c.muted};">${escapeHtml(params.caption)}</p>`
    : "";

  return `
    <table role="presentation" class="ac-primary-panel" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${c.primaryPanel}"
           style="margin:4px 0 24px;background-color:${c.primaryPanel};border:1px solid ${c.primaryBorder};border-radius:16px;">
      <tr>
        <td class="ac-code-pad" align="center" style="padding:26px 20px;">
          <p class="ac-link" style="margin:0 0 14px;font-family:${EMAIL_FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${c.primaryLink};">${escapeHtml(params.label)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr>
              <td class="ac-code-chip" align="center" bgcolor="${c.surface}"
                  style="padding:16px 22px;background-color:${c.surface};border:1px solid ${c.primaryBorder};border-radius:12px;">
                <span class="ac-code" style="display:block;font-family:${EMAIL_MONO_STACK};font-size:36px;line-height:1.1;font-weight:700;letter-spacing:0.22em;text-indent:0.22em;color:${c.text};white-space:nowrap;">${code}</span>
              </td>
            </tr>
          </table>
          ${caption}
        </td>
      </tr>
    </table>`;
}

/** Tinted caution panel for the "you didn't ask for this" branch. */
export function noticePanel(params: { heading: string; body: string }): string {
  return `
    <table role="presentation" class="ac-notice" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${c.warningPanel}"
           style="margin:0 0 4px;background-color:${c.warningPanel};border:1px solid ${c.warningBorder};border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p class="ac-notice-text" style="margin:0 0 4px;font-family:${EMAIL_FONT_STACK};font-size:13px;font-weight:700;line-height:1.5;color:${c.warningText};">${escapeHtml(params.heading)}</p>
          <p class="ac-notice-text" style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:1.6;color:${c.warningText};">${escapeHtml(params.body)}</p>
        </td>
      </tr>
    </table>`;
}

/** Neutral key/value panel — invite details, request metadata. */
export function detailPanel(rows: Array<{ label: string; value: string }>): string {
  const body = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding:${index === 0 ? "0" : "10px"} 16px 0 0;width:40%;vertical-align:top;">
          <span class="ac-muted" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:1.5;color:${c.muted};">${escapeHtml(row.label)}</span>
        </td>
        <td style="padding:${index === 0 ? "0" : "10px"} 0 0;vertical-align:top;">
          <span class="ac-strong" style="font-family:${EMAIL_FONT_STACK};font-size:13px;font-weight:600;line-height:1.5;color:${c.text};">${escapeHtml(row.value)}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" class="ac-panel" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${c.panel}"
           style="margin:0 0 20px;background-color:${c.panel};border:1px solid ${c.border};border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${body}</table>
        </td>
      </tr>
    </table>`;
}

/** "What you get" strip — used on onboarding mails, never on the code mail. */
export function featureStrip(params: { label: string; items: readonly string[] }): string {
  const items = params.items.map((item) => escapeHtml(item)).join(
    `<span class="ac-faint" style="padding:0 8px;color:${c.faint};">&middot;</span>`,
  );

  return `
    <table role="presentation" class="ac-panel" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${c.panel}"
           style="margin:0 0 20px;background-color:${c.panel};border:1px solid ${c.border};border-radius:12px;">
      <tr>
        <td style="padding:14px 18px;">
          <p class="ac-muted" style="margin:0 0 6px;font-family:${EMAIL_FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${c.muted};">${escapeHtml(params.label)}</p>
          <p class="ac-text" style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:1.6;color:${c.text};">${items}</p>
        </td>
      </tr>
    </table>`;
}

export function rule(): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr><td class="ac-rule" height="1" bgcolor="${c.border}" style="height:1px;line-height:1px;font-size:0;background-color:${c.border};">&nbsp;</td></tr>
    </table>`;
}
