import type { ReactNode } from "react";

import { buildMarketingJsonLd } from "@/lib/seo/marketing-seo";

type JsonLdGraph = Record<string, unknown>;

type MarketingJsonLdProps = {
  extra?: JsonLdGraph | JsonLdGraph[];
};

export function MarketingJsonLd({ extra }: MarketingJsonLdProps) {
  const graphs: JsonLdGraph[] = [...buildMarketingJsonLd()];
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

export function MarketingPageJsonLd({
  page,
  children,
}: {
  page: JsonLdGraph;
  children?: ReactNode;
}) {
  return (
    <>
      <MarketingJsonLd extra={page} />
      {children}
    </>
  );
}
