import { MobileDownloadExperience } from "@/components/marketing/download/mobile-download-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("downloadMobile");

export const revalidate = 3600;

export default function DownloadMobilePage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("downloadMobile"), buildBreadcrumbJsonLd("downloadMobile")]}
      />
      <MobileDownloadExperience />
    </>
  );
}
