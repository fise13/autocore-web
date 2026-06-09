import type { Metadata } from "next";

import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import {
  getMarketingSeoPage,
  MARKETING_BRAND,
  MARKETING_KEYWORDS,
  type MarketingSeoPageConfig,
} from "@/lib/seo/marketing-seo";
import { getMarketingUrl } from "@/lib/site-urls";

type BuildMarketingMetadataOverrides = Partial<Omit<MarketingSeoPageConfig, "key">>;

export function buildMarketingMetadata(
  key: MarketingPathKey,
  overrides?: BuildMarketingMetadataOverrides,
): Metadata {
  const base = getMarketingSeoPage(key);
  const page: MarketingSeoPageConfig = { ...base, ...overrides, key };
  const canonical = marketingAbsoluteUrl(key);
  const marketingUrl = getMarketingUrl();
  const keywords = [...MARKETING_KEYWORDS, ...(page.keywords ?? [])];
  const ogTitle = page.ogTitle ?? page.title;

  return {
    title: page.title,
    description: page.description,
    keywords: [...keywords],
    metadataBase: new URL(marketingUrl),
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: MARKETING_BRAND.locale,
      siteName: MARKETING_BRAND.name,
      title: ogTitle,
      description: page.description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: page.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    category: "business",
  };
}

/** Root marketing layout defaults (home + title template). */
export function buildMarketingRootMetadata(): Metadata {
  const home = getMarketingSeoPage("home");

  return {
    ...buildMarketingMetadata("home"),
    title: {
      default: home.title,
      template: `%s · ${MARKETING_BRAND.name}`,
    },
  };
}
