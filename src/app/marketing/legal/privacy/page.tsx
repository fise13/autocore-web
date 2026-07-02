import { LegalExperience } from "@/components/marketing/legal/legal-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("privacy");

export const revalidate = 3600;

export default function PrivacyPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("privacy"), buildBreadcrumbJsonLd("privacy")]}
      />
      <LegalExperience documentKey="privacy" />
    </>
  );
}
