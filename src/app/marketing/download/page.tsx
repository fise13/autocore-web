import { DownloadExperience } from "@/components/marketing/download/download-experience";
import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

const copy = marketingSiteContent.download;

export const metadata = buildMarketingMetadata("download");

export const revalidate = 3600;

export default function DownloadPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("download"),
          buildBreadcrumbJsonLd("download"),
          buildFaqJsonLd([...copy.faq]),
        ]}
      />
      <DownloadExperience />
    </>
  );
}
