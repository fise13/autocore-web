import { SecurityExperience } from "@/components/marketing/security/security-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("security");

export const revalidate = 3600;

export default function SecurityPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("security"), buildBreadcrumbJsonLd("security")]}
      />
      <SecurityExperience />
    </>
  );
}
