import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import {
  marketingAbsoluteUrl,
  marketingCleanPaths,
  type MarketingPathKey,
} from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

const SITEMAP_PRIORITY: Record<MarketingPathKey, number> = {
  home: 1,
  product: 0.9,
  modules: 0.9,
  pricing: 0.85,
  security: 0.7,
  contact: 0.6,
  download: 0.8,
  downloadMobile: 0.6,
  privacy: 0.3,
  refund: 0.3,
  terms: 0.3,
};

const SITEMAP_CHANGE_FREQUENCY: Record<MarketingPathKey, "weekly" | "monthly" | "yearly"> = {
  home: "weekly",
  product: "weekly",
  modules: "weekly",
  pricing: "weekly",
  security: "monthly",
  contact: "monthly",
  download: "weekly",
  downloadMobile: "monthly",
  privacy: "yearly",
  refund: "yearly",
  terms: "yearly",
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");
  const ogImage = `${marketingUrl}/opengraph-image`;
  const keys = Object.keys(marketingCleanPaths) as MarketingPathKey[];

  return keys.flatMap((key) => {
    const priority = SITEMAP_PRIORITY[key];
    const languages: Record<string, string> = { "x-default": marketingAbsoluteUrl(key, routing.defaultLocale) };
    for (const loc of routing.locales) {
      languages[loc] = marketingAbsoluteUrl(key, loc);
    }

    return routing.locales.map((locale) => ({
      url: marketingAbsoluteUrl(key, locale),
      lastModified,
      changeFrequency: SITEMAP_CHANGE_FREQUENCY[key],
      priority,
      alternates: { languages },
      images: key === "home" || priority >= 0.85 ? [ogImage] : undefined,
    }));
  });
}
