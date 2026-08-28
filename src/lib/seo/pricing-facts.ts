/**
 * The advertised price, in one place.
 *
 * Structured data claimed $39 while the page, the FAQ, and Paddle all said $40
 * — and the yearly plan had no `Offer` at all. A price in schema.org markup
 * that disagrees with the visible price is a rich-result violation, so these
 * numbers now have a single home and `marketing-seo.test.ts` fails the build if
 * the published copy in `packages/i18n` ever drifts away from them again.
 *
 * Changing a price means changing it here, in the marketing messages, and in
 * Paddle. The test enforces the first two.
 */
export const MARKETING_PRICING = {
  currency: "USD",
  /** Per company, per month. */
  monthly: 40,
  /** Per company, per year — two months free versus monthly. */
  yearly: 400,
  trialDays: 14,
} as const;

/** `40` → `"40"`. schema.org wants price as a string. */
export function priceString(value: number): string {
  return String(value);
}

/** Formatted the way the marketing copy writes it, e.g. `$40`. */
export function formattedPrice(value: number): string {
  return `$${value}`;
}
