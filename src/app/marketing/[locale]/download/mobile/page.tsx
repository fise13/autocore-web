import { getTranslations, setRequestLocale } from "next-intl/server";

import { MobileDownloadExperience } from "@/components/marketing/download/mobile-download-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/marketing-seo";
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
  return buildMarketingMetadata("downloadMobile", locale);
}

export const revalidate = 3600;

export default async function DownloadMobilePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "marketing" });
  const platforms = t.raw("pages.downloadMobile.platforms") as Array<{ title: string }>;

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("downloadMobile", locale),
          buildBreadcrumbJsonLd("downloadMobile", locale),
          buildCollectionPageJsonLd(
            "downloadMobile",
            t("seo.pages.downloadMobile.title"),
            t("pages.downloadMobile.hero.description"),
            platforms.map((platform) => platform.title),
          ),
        ]}
      />
      <MobileDownloadExperience />
    </>
  );
}
