import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@autocore/i18n/config";
import { getLocaleMetadata } from "@autocore/i18n/config";
import { localizedPath } from "@/i18n/marketing-paths";
import { routing } from "@/i18n/routing";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl, marketingCleanPaths } from "@/lib/seo/marketing-paths";
import { getMarketingUrl } from "@/lib/site-urls";

const defaultOgImagePath = "/opengraph-image";

function marketingVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();

  const verification: NonNullable<Metadata["verification"]> = {};
  if (google) verification.google = google;
  if (yandex) verification.yandex = yandex;

  return Object.keys(verification).length > 0 ? verification : undefined;
}

function marketingOtherMeta(locale: AppLocale): Metadata["other"] {
  const meta = getLocaleMetadata(locale);
  const other: Record<string, string> = {
    "geo.region": "KZ",
    "geo.placename": "Kazakhstan",
    "content-language": locale,
    language: meta.englishName,
  };
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();
  if (yandex) other["yandex-verification"] = yandex;
  return other;
}

function ogLocale(locale: AppLocale): string {
  return locale === "ru" ? "ru_RU" : "en_US";
}

/** Localized metadata for a marketing page. */
export async function buildMarketingMetadata(
  key: MarketingPathKey,
  locale: AppLocale,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const title = t(`seo.pages.${key}.title`);
  const description = t(`seo.pages.${key}.description`);
  const ogTitle = t(`seo.pages.${key}.ogTitle`);
  const keywords = [
    ...(t.raw("seo.keywords.general") as string[]),
    ...((t.raw(`seo.keywords.${key}`) as string[] | undefined) ?? []),
  ];

  const canonical = marketingAbsoluteUrl(key, locale);
  const marketingUrl = getMarketingUrl();
  const languages: Record<string, string> = {
    "x-default": marketingAbsoluteUrl(key, routing.defaultLocale),
  };
  for (const loc of routing.locales) {
    languages[loc] = marketingAbsoluteUrl(key, loc);
  }

  return {
    title: {
      absolute: title,
    },
    description,
    keywords,
    metadataBase: new URL(marketingUrl),
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      alternateLocale: routing.locales
        .filter((item) => item !== locale)
        .map((item) => ogLocale(item)),
      siteName: t("brand.name"),
      title: ogTitle,
      description,
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
      description,
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
    other: marketingOtherMeta(locale),
  };
}

/** Root marketing layout defaults. */
export async function buildMarketingRootMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const home = await buildMarketingMetadata("home", locale);
  const marketingUrl = getMarketingUrl();
  const brand = t("brand.name");

  return {
    ...home,
    title: {
      default: t("seo.pages.home.title"),
      template: `%s | ${brand}`,
    },
    applicationName: brand,
    authors: [{ name: brand, url: marketingUrl }],
    creator: brand,
    publisher: brand,
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    referrer: "origin-when-cross-origin",
    appleWebApp: {
      capable: true,
      title: brand,
      statusBarStyle: "black-translucent",
    },
    verification: marketingVerification(),
  };
}

/** Helper for pages: resolve pathname key from marketing clean path. */
export function marketingKeyFromPathname(pathname: string): MarketingPathKey | null {
  const entry = Object.entries(marketingCleanPaths).find(([, value]) => value === pathname);
  return (entry?.[0] as MarketingPathKey | undefined) ?? null;
}

export function absoluteLocalizedUrl(locale: AppLocale, pathname: string): string {
  return `${getMarketingUrl().replace(/\/$/, "")}${localizedPath(locale, pathname)}`;
}
