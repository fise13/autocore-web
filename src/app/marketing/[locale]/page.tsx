import { setRequestLocale } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildFaqJsonLdFromMessages } from "@/lib/seo/marketing-seo";
import { isAppLocale } from "@autocore/i18n/config";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  return buildMarketingMetadata("home", locale);
}

export const revalidate = 3600;

export default async function MarketingHomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "marketing" });
  const faqItems = t.raw("landing.faq.items") as Array<{ q: string; a: string }>;

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("home", locale),
          buildBreadcrumbJsonLd("home", locale),
          buildFaqJsonLdFromMessages(faqItems),
        ]}
      />
      <MarketingPage />
    </>
  );
}
