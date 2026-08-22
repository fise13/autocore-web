/** Single marketing plan — one price, entire product (matches the public site). */
export interface MarketingPlan {
  name: "AutoCore Pro";
  description: string;
  priceId: { month: string; year: string };
}

export const MARKETING_PLAN: MarketingPlan = {
  name: "AutoCore Pro",
  description: "One subscription per company — warehouse, work orders, documents, mobile, and web.",
  priceId: {
    month:
      process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY ?? "pri_01m0mhggbp5skqpsmwh2963d53",
    year:
      process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY ?? "pri_01m0mhggj8n34g89jfb60mnqev",
  },
};

export type MarketingBillingFrequency = "month" | "year";

export function marketingPriceIdForFrequency(frequency: MarketingBillingFrequency): string {
  return frequency === "year" ? MARKETING_PLAN.priceId.year : MARKETING_PLAN.priceId.month;
}

export function allMarketingPriceIds(): string[] {
  return [MARKETING_PLAN.priceId.month, MARKETING_PLAN.priceId.year];
}
