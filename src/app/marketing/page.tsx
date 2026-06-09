import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { buildFaqJsonLd } from "@/lib/seo/marketing-seo";

export default function MarketingRoutePage() {
  return (
    <>
      <MarketingJsonLd extra={buildFaqJsonLd(marketingSiteContent.faq.items)} />
      <MarketingPage />
    </>
  );
}
