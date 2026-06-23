import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingPricingSection } from "@/components/marketing/pricing/marketing-pricing-section";
import { PricingPageExtras } from "@/components/marketing/pricing/pricing-page-extras";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.pricing;

const pricingFaqItems = [
  {
    q: "Нужна ли карта для пробного периода?",
    a: "Нет. Регистрируетесь, создаёте компанию и работаете 14 дней без привязки карты.",
  },
  {
    q: "Можно ли перейти с Pro на Enterprise позже?",
    a: "Да. Напишите нам — поможем с несколькими точками и расширенным онбордингом.",
  },
  ...marketingSiteContent.faq.items.slice(0, 2),
];

export const metadata = buildMarketingMetadata("pricing");

export const revalidate = 3600;

export default function PricingPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildBreadcrumbJsonLd("pricing"), buildFaqJsonLd(pricingFaqItems)]}
      />
      <MarketingSubpage
        title={copy.hero.title}
        description={copy.hero.description}
        breadcrumbLabel="Тарифы"
        eyebrow="Тарифы"
        pathKey="pricing"
      >
        <MarketingPricingSection />
        <PricingPageExtras />
      </MarketingSubpage>
    </>
  );
}
