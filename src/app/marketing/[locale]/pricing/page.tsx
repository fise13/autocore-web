import { setRequestLocale } from "next-intl/server";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { PricingExperience } from "@/components/marketing/pricing/pricing-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing } from "@/i18n/routing";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildPricingOfferJsonLd } from "@/lib/seo/marketing-seo";
import { isAppLocale } from "@autocore/i18n/config";

const copy = marketingSiteContent.pricing;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  return buildMarketingMetadata("pricing", locale);
}

export const revalidate = 3600;

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);

  return (
    <>
      <MarketingExtraJsonLd
        extra={[
          buildWebPageJsonLd("pricing", locale),
          buildBreadcrumbJsonLd("pricing", locale),
          buildPricingOfferJsonLd(),
          buildFaqJsonLd([...copy.faq]),
        ]}
      />
      <PricingExperience />
    </>
  );
}
