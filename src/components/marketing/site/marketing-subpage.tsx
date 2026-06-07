import Link from "next/link";
import { ReactNode } from "react";

import { MarketingCtaStrip } from "@/components/marketing/site/marketing-cta-strip";
import { PageHeader } from "@/components/marketing/site/page-header";
import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { marketingRoutes } from "@/lib/marketing-routes";

type MarketingSubpageProps = {
  title: string;
  description: string;
  breadcrumbLabel: string;
  children: ReactNode;
  showCta?: boolean;
};

export function MarketingSubpage({
  title,
  description,
  breadcrumbLabel,
  children,
  showCta = true,
}: MarketingSubpageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "AutoCore", href: marketingRoutes.home },
          { label: breadcrumbLabel },
        ]}
      />
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">{children}</div>
      {showCta ? <MarketingCtaStrip /> : null}
      <section className="border-t border-border bg-muted/25 py-10">
        <nav
          className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-6 gap-y-2 px-5 md:px-8"
          aria-label="Навигация по сайту"
        >
          <Link href={marketingRoutes.home} className="text-sm font-medium text-primary hover:underline">
            Главная
          </Link>
          {siteNavigation.productGroup.items.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {siteNavigation.primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
