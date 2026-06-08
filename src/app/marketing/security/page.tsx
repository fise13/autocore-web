import type { Metadata } from "next";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { SecurityPageContent } from "@/components/marketing/site/security-page-content";

const copy = marketingSiteContent.security;

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function SecurityPage() {
  return (
    <MarketingSubpage
      title={copy.hero.title}
      description={copy.hero.description}
      breadcrumbLabel="Безопасность"
      eyebrow="Enterprise-ready"
    >
      <SecurityPageContent />
    </MarketingSubpage>
  );
}
