import Link from "next/link";

import { AppLogo } from "@/components/brand/app-logo";
import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDashboardUrl, appLoginUrl, getAppUrl, getMarketingUrl } from "@/lib/site-urls";

const FOOTER_SECTIONS = [
  {
    title: "Продукт",
    links: [
      { href: `${marketingRoutes.home}#graph`, label: "Карта ценности" },
      { href: marketingRoutes.product, label: "Обзор продукта" },
      { href: marketingRoutes.modules, label: "Каталог модулей" },
      { href: `${marketingRoutes.home}#modules`, label: "Справочник модулей" },
      { href: `${marketingRoutes.home}#process`, label: "Операционная цепочка" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: marketingRoutes.security, label: "Безопасность" },
      { href: marketingRoutes.pricing, label: "Тарифы" },
      { href: marketingRoutes.contact, label: "Контакты" },
    ],
  },
  {
    title: "Приложение",
    links: [
      { href: appLoginUrl(), label: landingCopy.nav.signIn },
      { href: appDashboardUrl(), label: landingCopy.nav.openDashboard },
    ],
  },
  {
    title: "Правовая информация",
    links: [
      { href: marketingRoutes.privacy, label: "Конфиденциальность" },
      { href: marketingRoutes.terms, label: "Условия использования" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const copy = landingCopy.footer;

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-4 lg:col-span-1">
            <Link href={marketingRoutes.home} className="inline-flex items-center gap-2.5">
              <AppLogo size={28} />
              <span className="font-semibold">AutoCore</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{copy.tagline}</p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-4 text-xs font-semibold tracking-wide text-foreground uppercase">{section.title}</p>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border/80 pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} AutoCore. Все права защищены.</p>
          <p>
            Сайт: {getMarketingUrl().replace(/^https?:\/\//, "")} · Приложение:{" "}
            {getAppUrl().replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>
    </footer>
  );
}
