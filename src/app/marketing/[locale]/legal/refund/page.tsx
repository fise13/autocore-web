import { setRequestLocale } from "next-intl/server";

import { LegalExperience } from "@/components/marketing/legal/legal-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
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
  return buildMarketingMetadata("refund", locale);
}

export const revalidate = 3600;

export default async function RefundPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("refund", locale), buildBreadcrumbJsonLd("refund", locale)]}
      />
      <LegalExperience documentKey="refund" />
    </>
  );
}
