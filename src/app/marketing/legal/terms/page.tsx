import { LegalExperience } from "@/components/marketing/legal/legal-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("terms");

export const revalidate = 3600;

export default function TermsPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("terms"), buildBreadcrumbJsonLd("terms")]}
      />
      <LegalExperience documentKey="terms" />
    </>
  );
}
