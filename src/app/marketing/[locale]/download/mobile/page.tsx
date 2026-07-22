import { setRequestLocale } from "next-intl/server";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MobileDownloadExperience } from "@/components/marketing/download/mobile-download-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/marketing-seo";
import { isAppLocale } from "@autocore/i18n/config";

const copy = marketingSiteContent.downloadMobile;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  return buildMarketingMetadata("downloadMobile", locale);
}

export const revalidate = 3600;

export default async function DownloadMobilePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("downloadMobile", locale),
          buildBreadcrumbJsonLd("downloadMobile", locale),
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
