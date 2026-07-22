"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { MarketingCtaStrip } from "@/components/marketing/site/marketing-cta-strip";
import { PageHeader } from "@/components/marketing/site/page-header";
import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { Link } from "@/i18n/navigation";
import type { MarketingPathKey } from "@/lib/seo/marketing-paths";

type MarketingSubpageProps = {
  title: string;
  description: string;
  breadcrumbLabel: string;
  eyebrow?: string;
  /** Kept for callers; WebPage JSON-LD is emitted by each page.tsx to avoid duplicates. */
  pathKey?: MarketingPathKey;
  children: ReactNode;
  showCta?: boolean;
};

export function MarketingSubpage({
  title,
  description,
  breadcrumbLabel,
  eyebrow,
  children,
  showCta = true,
}: MarketingSubpageProps) {
  const t = useTranslations("marketing");

  return (
    <div className="marketing-subpage">
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        breadcrumbs={[
          { label: t("brand.name"), href: "/" },
          { label: breadcrumbLabel },
        ]}
      />
      <div className="landing-container marketing-subpage-body">{children}</div>
      {showCta ? <MarketingCtaStrip /> : null}
      <nav className="marketing-subpage-nav" aria-label={t("a11y.nav.mainNavAria")}>
        <div className="landing-container flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            {t("seo.breadcrumbs.home")}
          </Link>
          {siteNavigation.productGroup.items.slice(0, 3).map((link) => (
            <Link key={link.key} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {t(`nav.productMenu.items.${link.key}.label`)}
            </Link>
          ))}
          {siteNavigation.primaryLinks.map((link) => (
            <Link key={link.key} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {t(`nav.primaryLinks.${link.key}`)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
