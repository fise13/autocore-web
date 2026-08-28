/**
 * Escape a value for interpolation into an email HTML body.
 *
 * Everything a person types into a support or feedback form reaches a mailbox
 * as HTML, so it is untrusted markup until it passes through here. Quotes are
 * escaped alongside the angle brackets: a value is as likely to land inside an
 * attribute as between tags, and a helper that is only safe in one of those
 * positions is the kind that eventually gets used in the other.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same, but newlines survive as line breaks. */
export function escapeHtmlParagraph(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}
