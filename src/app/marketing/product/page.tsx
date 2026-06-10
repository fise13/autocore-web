import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ProductPageContent } from "@/components/marketing/site/product-page-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.product;

export const metadata = buildMarketingMetadata("product");

export default function ProductPage() {
  return (
    <>
      <MarketingExtraJsonLd extra={buildBreadcrumbJsonLd("product")} />
      <MarketingSubpage
        title={copy.hero.title}
        description={copy.hero.description}
        breadcrumbLabel="Продукт"
        eyebrow="AutoCore"
      >
        <ProductPageContent />
      </MarketingSubpage>
    </>
  );
}
