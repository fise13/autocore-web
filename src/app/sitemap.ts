import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { contentLastModified } from "@/lib/seo/content-modified";
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
  howItWorks: 0.85,
  pricing: 0.85,
  security: 0.7,
  contact: 0.6,
  download: 0.8,
  downloadMobile: 0.6,
  privacy: 0.3,
  refund: 0.3,
  terms: 0.3,
};

/**
 * hreflang belongs in a sitemap only when there is more than one language to
 * declare. With a single locale the old output listed `x-default` and `en`
 * pointing at the very same `<loc>` — eleven URLs of self-referencing noise.
 */
function languageAlternates(key: MarketingPathKey) {
  if (routing.locales.length < 2) return undefined;

  const languages: Record<string, string> = {
    "x-default": marketingAbsoluteUrl(key, routing.defaultLocale),
  };
  for (const locale of routing.locales) {
    languages[locale] = marketingAbsoluteUrl(key, locale);
  }
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");
  const ogImage = `${marketingUrl}/opengraph-image`;
  const keys = (Object.keys(marketingCleanPaths) as MarketingPathKey[]).filter(
    (key) => key !== "downloadMobile",
  );

  return keys.flatMap((key) => {
    const priority = SITEMAP_PRIORITY[key];
    const languages = languageAlternates(key);
    // Real commit date, or nothing. See `content-modified.ts` for why a
    // build-time `new Date()` on every URL was actively harmful.
    const lastModified = contentLastModified(key) ?? undefined;

    return routing.locales.map((locale) => ({
      url: marketingAbsoluteUrl(key, locale),
      ...(lastModified ? { lastModified } : {}),
      priority,
      ...(languages ? { alternates: { languages } } : {}),
      images: priority >= 0.85 ? [ogImage] : undefined,
    }));
  });
}
