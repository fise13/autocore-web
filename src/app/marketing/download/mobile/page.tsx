import { MobileDownloadExperience } from "@/components/marketing/download/mobile-download-experience";
import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

const copy = marketingSiteContent.downloadMobile;

export const metadata = buildMarketingMetadata("downloadMobile");

export const revalidate = 3600;

export default function DownloadMobilePage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("downloadMobile"),
          buildBreadcrumbJsonLd("downloadMobile"),
          buildCollectionPageJsonLd(
            "downloadMobile",
            "Скачать AutoCore на iPhone и Android",
            copy.hero.description,
            copy.platforms.map((platform) => platform.title),
          ),
        ]}
      />
      <MobileDownloadExperience />
    </>
  );
}
