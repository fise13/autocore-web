import type { MetadataRoute } from "next";

import { marketingCleanPaths, resolveMarketingPath } from "@/lib/seo/marketing-paths";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

/** Marketing URLs — clean paths in production, /marketing/* on localhost dev. */
export const marketingRoutes = {
  get home() {
    return resolveMarketingPath("home");
  },
  get product() {
    return resolveMarketingPath("product");
  },
  get modules() {
    return resolveMarketingPath("modules");
  },
  get pricing() {
    return resolveMarketingPath("pricing");
  },
  get security() {
    return resolveMarketingPath("security");
  },
  get contact() {
    return resolveMarketingPath("contact");
  },
  get download() {
    return resolveMarketingPath("download");
  },
  get downloadMobile() {
    return resolveMarketingPath("downloadMobile");
  },
  get privacy() {
    return resolveMarketingPath("privacy");
  },
  get terms() {
    return resolveMarketingPath("terms");
  },
} as const satisfies Record<MarketingPathKey, string>;

/** Canonical clean paths for sitemap and production SEO only. */
export const marketingCanonicalRoutes = marketingCleanPaths;

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
  { key: "download", changeFrequency: "monthly", priority: 0.75 },
  { key: "privacy", changeFrequency: "yearly", priority: 0.4 },
  { key: "terms", changeFrequency: "yearly", priority: 0.4 },
];

export function marketingSitemapPaths(): string[] {
  return marketingSitemapEntries.map((entry) => marketingCanonicalRoutes[entry.key]);
}
