import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ModulesPageContent } from "@/components/marketing/site/modules-page-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.modules;

export const metadata = buildMarketingMetadata("modules");

export const revalidate = 3600;

export default function ModulesPage() {
  return (
    <>
      <MarketingExtraJsonLd extra={buildBreadcrumbJsonLd("modules")} />
      <MarketingSubpage
        title="Каталог модулей для авторазборок и автосервисов"
        description={copy.meta.description}
        breadcrumbLabel="Модули"
        eyebrow="Экосистема"
        pathKey="modules"
      >
        <ModulesPageContent />
      </MarketingSubpage>
    </>
  );
}
