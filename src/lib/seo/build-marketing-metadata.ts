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
const defaultOgImagePath = "/opengraph-image";

/** Search-console verification, opt-in via env (Google Search Console / Yandex Webmaster). */
function marketingVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();

  const verification: NonNullable<Metadata["verification"]> = {};
  if (google) verification.google = google;
  if (yandex) verification.yandex = yandex;

  return Object.keys(verification).length > 0 ? verification : undefined;
}

/** Extra meta tags Yandex and regional SERPs still read. */
function marketingOtherMeta(): Metadata["other"] {
  const other: Record<string, string> = {
    "geo.region": "KZ",
    "geo.placename": "Kazakhstan",
    "content-language": "ru",
    language: "Russian",
  };
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();
  if (yandex) other["yandex-verification"] = yandex;
  return other;
}

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
    title: {
      absolute: page.title,
    },
    description: page.description,
    keywords: [...keywords],
    metadataBase: new URL(marketingUrl),
    alternates: {
      canonical,
      languages: {
        "ru-RU": canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      type: "website",
      locale: MARKETING_BRAND.locale,
      alternateLocale: ["ru_KZ", "kk_KZ"],
      siteName: MARKETING_BRAND.name,
      title: ogTitle,
      description: page.description,
      url: canonical,
      images: [
        {
          url: defaultOgImagePath,
          width: 1200,
          height: 630,
          alt: ogTitle,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: page.description,
      images: [defaultOgImagePath],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "business",
    other: marketingOtherMeta(),
  };
}

/** Root marketing layout defaults (home + title template + site-wide signals). */
export function buildMarketingRootMetadata(): Metadata {
  const home = getMarketingSeoPage("home");
  const marketingUrl = getMarketingUrl();

  return {
    ...buildMarketingMetadata("home"),
    title: {
      default: home.title,
      template: `%s | ${MARKETING_BRAND.name}`,
    },
    applicationName: MARKETING_BRAND.name,
    authors: [{ name: MARKETING_BRAND.name, url: marketingUrl }],
    creator: MARKETING_BRAND.name,
    publisher: MARKETING_BRAND.name,
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    referrer: "origin-when-cross-origin",
    appleWebApp: {
      capable: true,
      title: MARKETING_BRAND.name,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      ...buildMarketingMetadata("home").openGraph,
      images: [
        {
          url: defaultOgImagePath,
          width: 1200,
          height: 630,
          alt: home.ogTitle ?? home.title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      ...buildMarketingMetadata("home").twitter,
      images: [defaultOgImagePath],
    },
    verification: marketingVerification(),
  };
}
