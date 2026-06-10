import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { buildFaqJsonLd } from "@/lib/seo/marketing-seo";

export default function MarketingRoutePage() {
  return (
    <>
      <MarketingExtraJsonLd extra={buildFaqJsonLd(marketingSiteContent.faq.items)} />
      <MarketingPage />
    </>
  );
}
