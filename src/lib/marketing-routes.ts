import type { MetadataRoute } from "next";

import { marketingCleanPaths } from "@/lib/seo/marketing-paths";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

/** Public marketing URLs — always clean paths (/pricing, never /marketing/pricing). */
export const marketingRoutes = {
  home: marketingCleanPaths.home,
  product: marketingCleanPaths.product,
  modules: marketingCleanPaths.modules,
  pricing: marketingCleanPaths.pricing,
  security: marketingCleanPaths.security,
  contact: marketingCleanPaths.contact,
  privacy: marketingCleanPaths.privacy,
  terms: marketingCleanPaths.terms,
} as const;

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
