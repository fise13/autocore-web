import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ProductPageContent } from "@/components/marketing/site/product-page-content";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";

const copy = marketingSiteContent.product;

export const metadata = buildMarketingMetadata("product");

export default function ProductPage() {
  return (
    <MarketingSubpage
      title={copy.hero.title}
      description={copy.hero.description}
      breadcrumbLabel="Продукт"
      eyebrow="AutoCore"
    >
      <ProductPageContent />
    </MarketingSubpage>
  );
}
