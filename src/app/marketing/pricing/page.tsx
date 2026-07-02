import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { PricingExperience } from "@/components/marketing/pricing/pricing-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

const copy = marketingSiteContent.pricing;

export const metadata = buildMarketingMetadata("pricing");

export const revalidate = 3600;

export default function PricingPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("pricing"),
          buildBreadcrumbJsonLd("pricing"),
          buildFaqJsonLd([...copy.faq]),
        ]}
      />
      <PricingExperience />
    </>
  );
}
