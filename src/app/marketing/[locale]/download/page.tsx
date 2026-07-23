import { getTranslations, setRequestLocale } from "next-intl/server";

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

  const t = await getTranslations({ locale, namespace: "marketing" });
  const faqItems = t.raw("pages.download.faq") as Array<{ q: string; a: string }>;
  const platforms = t.raw("pages.download.platforms") as Array<{ title: string }>;

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("download", locale),
          buildBreadcrumbJsonLd("download", locale),
          buildCollectionPageJsonLd(
            "download",
            t("seo.pages.download.title"),
            t("pages.download.meta.description"),
            platforms.map((platform) => platform.title),
          ),
          buildFaqJsonLd(faqItems),
        ]}
      />
      <DownloadExperience />
    </>
  );
}
