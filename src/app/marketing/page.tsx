import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildFaqJsonLd } from "@/lib/seo/marketing-seo";

export const metadata = buildMarketingMetadata("home");

export const revalidate = 3600;

export default function MarketingRoutePage() {
  return (
    <>
      <MarketingExtraJsonLd extra={[buildWebPageJsonLd("home"), buildFaqJsonLd(marketingSiteContent.faq.items)]} />
      <MarketingPage />
    </>
  );
}
