import { ContactExperience } from "@/components/marketing/contact/contact-experience";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";

export const metadata = buildMarketingMetadata("contact");

export const revalidate = 3600;

export default function ContactPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildWebPageJsonLd("contact"), buildBreadcrumbJsonLd("contact")]}
      />
      <ContactExperience />
    </>
  );
}
