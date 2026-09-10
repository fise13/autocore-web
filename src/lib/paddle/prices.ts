/** Paddle live Price IDs — AutoCore Pro @ $15/mo. */
export const paddlePriceIds = {
  proMonthly:
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY ?? "pri_01m0mhggbp5skqpsmwh2963d53",
  proYearly:
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY ?? "pri_01m0mhggj8n34g89jfb60mnqev",
} as const;

export type PaddleBillingInterval = "monthly" | "yearly";

export function paddlePriceIdForInterval(interval: PaddleBillingInterval): string {
  return interval === "yearly" ? paddlePriceIds.proYearly : paddlePriceIds.proMonthly;
}

export function isPaddleBillingConfigured(): boolean {
  return Boolean(paddlePriceIds.proMonthly && paddlePriceIds.proYearly);
}

export function billingIntervalFromPaddlePriceId(
  priceId: string | undefined | null,
): PaddleBillingInterval | null {
  if (!priceId) return null;
  if (priceId === paddlePriceIds.proYearly) return "yearly";
  if (priceId === paddlePriceIds.proMonthly) return "monthly";
  return null;
}
