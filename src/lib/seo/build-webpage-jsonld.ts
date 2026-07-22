import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE } from "@autocore/i18n/config";

import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getMarketingMessages } from "@/lib/seo/marketing-seo";
import { getMarketingUrl } from "@/lib/site-urls";

export function buildWebPageJsonLd(key: MarketingPathKey, locale: AppLocale = DEFAULT_LOCALE) {
  const page = getMarketingMessages(locale).seo.pages[key];
  const url = marketingAbsoluteUrl(key, locale);
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: { "@id": `${marketingUrl}#website` },
    about: { "@id": `${marketingUrl}#software` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${marketingUrl}/opengraph-image`,
    },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    dateModified: new Date().toISOString().slice(0, 10),
  };
}
