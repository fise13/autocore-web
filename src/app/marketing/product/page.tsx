import type { Metadata } from "next";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ProductPageContent } from "@/components/marketing/site/product-page-content";

const copy = marketingSiteContent.product;

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

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
