import Link from "next/link";
import { ReactNode } from "react";

import { PageHeader } from "@/components/marketing/site/page-header";
import { SiteShell } from "@/components/marketing/site/site-shell";
import { marketingRoutes } from "@/lib/marketing-routes";

type MarketingSubpageProps = {
  title: string;
  description: string;
  breadcrumbLabel: string;
  children: ReactNode;
};

export function MarketingSubpage({ title, description, breadcrumbLabel, children }: MarketingSubpageProps) {
  return (
    <SiteShell>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "AutoCore", href: marketingRoutes.home },
          { label: breadcrumbLabel },
        ]}
      />
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">{children}</div>
      <section className="border-t border-border bg-muted/25 py-10">
        <nav
          className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-5 md:px-8"
          aria-label="Навигация по сайту"
        >
          <Link href={marketingRoutes.home} className="text-sm font-medium text-primary hover:underline">
            Главная
          </Link>
          <Link href={marketingRoutes.modules} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Модули
          </Link>
          <Link href={`${marketingRoutes.home}#why-business`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Зачем AutoCore
          </Link>
          <Link href={marketingRoutes.contact} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Контакты
          </Link>
        </nav>
      </section>
    </SiteShell>
  );
}
