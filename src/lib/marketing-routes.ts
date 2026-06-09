import type { MetadataRoute } from "next";

import { marketingCleanPaths } from "@/lib/seo/marketing-paths";
import { usesCleanMarketingPaths } from "@/lib/seo/marketing-paths";
import { marketingInternalPaths } from "@/lib/seo/marketing-paths";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

export const marketingRoutes = {
  get home() {
    return resolveRoute("home");
  },
  get product() {
    return resolveRoute("product");
  },
  get modules() {
    return resolveRoute("modules");
  },
  get pricing() {
    return resolveRoute("pricing");
  },
  get security() {
    return resolveRoute("security");
  },
  get contact() {
    return resolveRoute("contact");
  },
  get privacy() {
    return resolveRoute("privacy");
  },
  get terms() {
    return resolveRoute("terms");
  },
} as const;

function resolveRoute(key: MarketingPathKey): string {
  return usesCleanMarketingPaths() ? marketingCleanPaths[key] : marketingInternalPaths[key];
}

export const marketingSitemapEntries: Array<{
  key: MarketingPathKey;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { key: "home", changeFrequency: "weekly", priority: 1 },
  { key: "product", changeFrequency: "weekly", priority: 0.9 },
  { key: "modules", changeFrequency: "weekly", priority: 0.9 },
  { key: "pricing", changeFrequency: "weekly", priority: 0.85 },
  { key: "security", changeFrequency: "monthly", priority: 0.8 },
  { key: "contact", changeFrequency: "monthly", priority: 0.7 },
  { key: "privacy", changeFrequency: "yearly", priority: 0.4 },
  { key: "terms", changeFrequency: "yearly", priority: 0.4 },
];

export function marketingSitemapPaths(): string[] {
  return marketingSitemapEntries.map((entry) => marketingRoutes[entry.key]);
}
