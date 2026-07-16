import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getMarketingSeoPage, MARKETING_BRAND } from "@/lib/seo/marketing-seo";
import { getMarketingUrl } from "@/lib/site-urls";

export function buildWebPageJsonLd(key: MarketingPathKey) {
  const page = getMarketingSeoPage(key);
  const url = marketingAbsoluteUrl(key);
  const marketingUrl = getMarketingUrl().replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: MARKETING_BRAND.language,
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
