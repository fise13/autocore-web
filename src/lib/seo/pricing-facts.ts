/**
 * The advertised price, in one place.
 *
 * Structured data must match the visible price (rich-result rule), so these
 * numbers have a single home and `marketing-seo.test.ts` fails the build if
 * the published copy in `packages/i18n` ever drifts away from them again.
 *
 * Changing a price means changing it here, in the marketing messages, and in
 * Paddle. The test enforces the first two.
 */
export const MARKETING_PRICING = {
  currency: "USD",
  /** Per company, per month. */
  monthly: 15,
  /** Per company, per year — two months free versus monthly. */
  yearly: 150,
  trialDays: 14,
} as const;

/** `15` → `"15"`. schema.org wants price as a string. */
export function priceString(value: number): string {
  return String(value);
}

/** Formatted the way the marketing copy writes it, e.g. `$15`. */
export function formattedPrice(value: number): string {
  return `$${value}`;
}
