import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE } from "@autocore/i18n/config";
import { buildMarketingJsonLd } from "@/lib/seo/marketing-seo";

type JsonLdGraph = Record<string, unknown>;

type MarketingJsonLdProps = {
  locale?: AppLocale;
  extra?: JsonLdGraph | JsonLdGraph[];
};

export function MarketingJsonLd({ locale = DEFAULT_LOCALE, extra }: MarketingJsonLdProps) {
  const graphs: JsonLdGraph[] = [...buildMarketingJsonLd(locale)];
  if (extra) {
    graphs.push(...(Array.isArray(extra) ? extra : [extra]));
  }

  return (
    <>
      {graphs.map((graph, index) => (
        <script
          key={`marketing-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}

/**
 * Renders only page-specific graphs (breadcrumbs, FAQ, …) without repeating the
 * Organization/WebSite/SoftwareApplication graphs that the marketing layout
 * already emits on every page.
 */
export function MarketingExtraJsonLd({ extra }: { extra: JsonLdGraph | JsonLdGraph[] }) {
  const graphs = Array.isArray(extra) ? extra : [extra];

  return (
    <>
      {graphs.map((graph, index) => (
        <script
          key={`marketing-extra-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}
