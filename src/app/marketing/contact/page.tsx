import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { ContactPageContent } from "@/components/marketing/site/contact-page-content";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.contact;

export const metadata = buildMarketingMetadata("contact");

export const revalidate = 3600;

export default function ContactPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildBreadcrumbJsonLd("contact"), buildFaqJsonLd(marketingSiteContent.faq.items)]}
      />
      <MarketingSubpage
        title={copy.hero.title}
        description={copy.hero.description}
        breadcrumbLabel="Контакты"
        eyebrow="Контакты"
        pathKey="contact"
      >
        <ContactPageContent />
      </MarketingSubpage>
    </>
  );
}
