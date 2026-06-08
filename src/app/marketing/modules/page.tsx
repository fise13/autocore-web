import type { Metadata } from "next";
import Link from "next/link";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ModulesPageContent } from "@/components/marketing/site/modules-page-content";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = marketingSiteContent.modules;

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function ModulesPage() {
  return (
    <MarketingSubpage
      title="Каталог модулей"
      description={copy.meta.description}
      breadcrumbLabel="Модули"
      eyebrow="Экосистема"
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
  );
}
