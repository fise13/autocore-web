import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";

export const metadata = buildMarketingMetadata("home");

export const revalidate = 3600;

export default function MarketingRoutePage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("home"),
          buildBreadcrumbJsonLd("home"),
          buildFaqJsonLd(landingContent.faq.items),
        ]}
      />
      <MarketingPage />
    </>
  );
}
