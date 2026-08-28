import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE } from "@autocore/i18n/config";

import { contentLastModified } from "@/lib/seo/content-modified";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getMarketingMessages } from "@/lib/seo/marketing-seo";
import { getMarketingUrl } from "@/lib/site-urls";

export function buildWebPageJsonLd(key: MarketingPathKey, locale: AppLocale = DEFAULT_LOCALE) {
  const page = getMarketingMessages(locale).seo.pages[key];
  const url = marketingAbsoluteUrl(key, locale);
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");
  // Same rule as the sitemap: a real commit date or no claim at all. This used
  // to be `new Date()`, which told every crawler that the terms of use had been
  // rewritten on the morning of each deploy.
  const modified = contentLastModified(key);

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
    ...(modified ? { dateModified: modified.toISOString().slice(0, 10) } : {}),
  };
}
