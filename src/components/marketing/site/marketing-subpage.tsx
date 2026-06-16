import Link from "next/link";
import { ReactNode } from "react";

import { MarketingCtaStrip } from "@/components/marketing/site/marketing-cta-strip";
import { PageHeader } from "@/components/marketing/site/page-header";
import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { marketingRoutes } from "@/lib/marketing-routes";
import { buildWebPageJsonLd } from "@/lib/seo/build-webpage-jsonld";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";

type MarketingSubpageProps = {
  title: string;
  description: string;
  breadcrumbLabel: string;
  eyebrow?: string;
  pathKey?: MarketingPathKey;
  children: ReactNode;
  showCta?: boolean;
};

export function MarketingSubpage({
  title,
  description,
  breadcrumbLabel,
  eyebrow,
  pathKey,
  children,
  showCta = true,
}: MarketingSubpageProps) {
  return (
    <div className="marketing-subpage">
      {pathKey ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebPageJsonLd(pathKey)) }}
        />
      ) : null}
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        breadcrumbs={[
          { label: "AutoCore", href: marketingRoutes.home },
          { label: breadcrumbLabel },
        ]}
      />
      <div className="landing-container marketing-subpage-body">{children}</div>
      {showCta ? <MarketingCtaStrip /> : null}
      <nav className="marketing-subpage-nav" aria-label="Навигация по сайту">
        <div className="landing-container flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href={marketingRoutes.home} className="text-sm font-medium text-primary hover:underline">
            Главная
          </Link>
          {siteNavigation.productGroup.items.slice(0, 3).map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
          {siteNavigation.primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
