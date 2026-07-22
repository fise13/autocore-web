import { setRequestLocale } from "next-intl/server";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { DownloadExperience } from "@/components/marketing/download/download-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
} from "@/lib/seo/marketing-seo";
import { isAppLocale } from "@autocore/i18n/config";

const copy = marketingSiteContent.download;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  return buildMarketingMetadata("download", locale);
}

export const revalidate = 3600;

export default async function DownloadPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("download", locale),
          buildBreadcrumbJsonLd("download", locale),
          buildCollectionPageJsonLd(
            "download",
            "Скачать AutoCore",
            copy.meta.description,
            copy.platforms.map((platform) => platform.title),
          ),
          buildFaqJsonLd([...copy.faq]),
        ]}
      />
      <DownloadExperience />
    </>
  );
}
