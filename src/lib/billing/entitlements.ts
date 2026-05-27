import { userCopy } from "@/lib/user-copy";

export const PRO_BILLING_FEATURES = [
  "export",
  "import",
  "sync",
  "invite",
  "cloud_sync",
] as const;

export type ProBillingFeature = (typeof PRO_BILLING_FEATURES)[number];

export function paywallCopy(feature: ProBillingFeature): { title: string; description: string } {
  return userCopy.billing.paywall[feature];
}
