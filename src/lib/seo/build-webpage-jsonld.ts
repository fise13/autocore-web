import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getMarketingSeoPage, MARKETING_BRAND } from "@/lib/seo/marketing-seo";

export function buildWebPageJsonLd(key: MarketingPathKey) {
  const page = getMarketingSeoPage(key);
  const url = marketingAbsoluteUrl(key);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: MARKETING_BRAND.language,
    isPartOf: {
      "@type": "WebSite",
      name: MARKETING_BRAND.name,
      url: marketingAbsoluteUrl("home"),
    },
  };
}
