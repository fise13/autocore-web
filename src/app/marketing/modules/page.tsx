import Link from "next/link";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ModulesPageContent } from "@/components/marketing/site/modules-page-content";
import { marketingRoutes } from "@/lib/marketing-routes";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/marketing-seo";

const copy = marketingSiteContent.modules;

export const metadata = buildMarketingMetadata("modules");

export const revalidate = 3600;

export default function ModulesPage() {
  return (
    <>
      <MarketingExtraJsonLd extra={buildBreadcrumbJsonLd("modules")} />
      <MarketingSubpage
        title="Каталог модулей для авторазборок и автосервисов"
        description={copy.meta.description}
        breadcrumbLabel="Модули"
        eyebrow="Экосистема"
        pathKey="modules"
      >
      <ModulesPageContent />

      <nav className="marketing-related-links mt-20" aria-label="Другие разделы">
        {[
          { href: marketingRoutes.product, label: "Обзор продукта", hint: "Mission Control и процессы" },
          { href: marketingRoutes.pricing, label: "Тарифы", hint: "Пробный период и Pro" },
          { href: marketingRoutes.security, label: "Безопасность", hint: "RBAC и аудит" },
          { href: marketingRoutes.contact, label: "Контакты", hint: "Демо и внедрение" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="marketing-related-link">
            <span className="block font-medium">{link.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{link.hint}</span>
          </Link>
        ))}
        </nav>
      </MarketingSubpage>
    </>
  );
}
