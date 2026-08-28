import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@autocore/i18n/config";
import { getLocaleMetadata } from "@autocore/i18n/config";
import { routing } from "@/i18n/routing";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
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

/**
 * `geo.region: KZ` / `geo.placename: Kazakhstan` used to ship on every page of
 * an English site whose titles target US salvage yards. Those are explicit
 * geo-targeting hints pointing away from the market the content is written
 * for, so they are gone; country targeting now comes from the content itself
 * and from `Organization.areaServed` in the JSON-LD.
 */
function marketingOtherMeta(locale: AppLocale): Metadata["other"] {
  const meta = getLocaleMetadata(locale);
  return {
    "content-language": locale,
    language: meta.englishName,
  };
}

/**
 * hreflang only earns its place when there is more than one locale to point
 * at. With a single locale the old code emitted `x-default` and `en` both
 * aimed at the very same URL — noise that says nothing a canonical does not.
 */
function marketingLanguageAlternates(key: MarketingPathKey) {
  if (routing.locales.length < 2) return undefined;

  const languages: Record<string, string> = {
    "x-default": marketingAbsoluteUrl(key, routing.defaultLocale),
  };
  for (const loc of routing.locales) {
    languages[loc] = marketingAbsoluteUrl(key, loc);
  }
  return languages;
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

  const canonical = marketingAbsoluteUrl(key, locale);
  const marketingUrl = getMarketingUrl();
  const languages = marketingLanguageAlternates(key);

  return {
    title: {
      absolute: title,
    },
    description,
    // No `keywords`. Google has ignored the meta tag since 2009 and the list
    // here had grown to 44 terms — a stuffed tag is at best inert and at worst
    // a spam signal. Keyword targeting belongs in the title, headings, and body.
    metadataBase: new URL(marketingUrl),
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
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

/**
 * Root marketing layout defaults, inherited by every page under it.
 *
 * `alternates` is deliberately dropped from the inherited home metadata: a
 * layout-level canonical pointing at the homepage is the kind of default that
 * silently mis-canonicalises any page that forgets to set its own. Every page
 * builds its canonical through `buildMarketingMetadata`, so the absence here
 * turns a forgotten canonical into a visible gap instead of a wrong URL.
 */
export async function buildMarketingRootMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const home = await buildMarketingMetadata("home", locale);
  const marketingUrl = getMarketingUrl();
  const brand = t("brand.name");

  return {
    ...home,
    alternates: undefined,
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
