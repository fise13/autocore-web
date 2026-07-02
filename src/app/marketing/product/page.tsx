import { ProductExperience } from "@/components/marketing/product/product-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("product");

export const revalidate = 3600;

export default function ProductPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("product"), buildBreadcrumbJsonLd("product")]}
      />
      <ProductExperience />
    </>
  );
}
