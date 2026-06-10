import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { SecurityPageContent } from "@/components/marketing/site/security-page-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.security;

export const metadata = buildMarketingMetadata("security");

export default function SecurityPage() {
  return (
    <>
      <MarketingExtraJsonLd extra={buildBreadcrumbJsonLd("security")} />
      <MarketingSubpage
        title={copy.hero.title}
        description={copy.hero.description}
        breadcrumbLabel="Безопасность"
        eyebrow="Enterprise-ready"
      >
        <SecurityPageContent />
      </MarketingSubpage>
    </>
  );
}
