/** Stripe Price IDs (test mode) — AutoCore product catalog. */
export const stripePriceIds = {
  proMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? "price_1TbiZUHo5bmy0A9LC86I6wJJ",
  proYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ?? "price_1TbiarHo5bmy0A9LD3SafymR",
  free: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE ?? "price_1TbiblHo5bmy0A9Lc8CwYfit",
} as const;

export type StripeBillingInterval = "monthly" | "yearly";

export function stripePriceIdForInterval(interval: StripeBillingInterval): string {
  return interval === "yearly" ? stripePriceIds.proYearly : stripePriceIds.proMonthly;
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(stripePriceIds.proMonthly && stripePriceIds.proYearly);
}
