import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  Package,
  Radar,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureIcon } from "@/components/marketing/site/feature-icon";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingCopy.pages.modules;

const ICONS: Record<string, LucideIcon> = {
  "mission-control": Radar,
  warehouse: Warehouse,
  "work-orders": Wrench,
  accounting: Banknote,
  inventory: Package,
  employees: Users,
};

const TONES = ["blue", "green", "amber", "blue", "green", "violet"] as const;

const RELATED: Record<string, { label: string; href: string }[]> = {
  "mission-control": [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Бухгалтерия", href: `${marketingRoutes.modules}#accounting` },
    { label: "Обзор продукта", href: marketingRoutes.product },
  ],
  warehouse: [
    { label: "Заказ-наряды", href: `${marketingRoutes.modules}#work-orders` },
    { label: "Один день в системе", href: `${marketingRoutes.home}#day` },
  ],
  "work-orders": [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Бухгалтерия", href: `${marketingRoutes.modules}#accounting` },
  ],
  accounting: [
    { label: "Mission Control", href: `${marketingRoutes.modules}#mission-control` },
    { label: "Безопасность", href: marketingRoutes.security },
  ],
  inventory: [{ label: "Склад", href: `${marketingRoutes.modules}#warehouse` }],
  employees: [
    { label: "Безопасность", href: marketingRoutes.security },
    { label: "Realtime", href: `${marketingRoutes.home}#realtime` },
  ],
};

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function ModulesPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Модули">
      <p className="mb-12 max-w-3xl text-lg text-muted-foreground">
        Каждый модуль AutoCore — не изолированный экран, а часть связанного контура. Ниже — развёрнутые
        описания с перекрёстными ссылками. Рабочий интерфейс совпадает с тем, что вы увидите после входа в
        систему.
      </p>

      <div className="space-y-16">
        {landingCopy.moduleDetails.map((mod, index) => {
          const Icon = ICONS[mod.id] ?? Radar;
          const related = RELATED[mod.id] ?? [];
          return (
            <article
              key={mod.id}
              id={mod.id}
              className="scroll-mt-28 border-t border-border pt-12 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-6 md:flex-row md:gap-10">
                <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{mod.tagline}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{mod.title}</h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{mod.description}</p>

                  <h3 className="mt-8 text-sm font-semibold">Возможности</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {mod.capabilities.map((cap) => (
                      <li key={cap} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                        {cap}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 text-sm">
                    <span className="font-medium text-foreground">Роли: </span>
                    <span className="text-muted-foreground">{mod.forWhom}</span>
                  </p>

                  {related.length > 0 ? (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Связанные разделы
                      </span>
                      {related.map((r) => (
                        <Link
                          key={r.href}
                          href={r.href}
                          className="site-chip site-chip-neutral text-xs hover:border-primary/30"
                        >
                          {r.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <Link
                    href={mod.learnMore}
                    className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Подробнее о модуле →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <nav className="mt-16 grid gap-3 border-t border-border pt-12 sm:grid-cols-2" aria-label="Другие разделы">
        <Link href={marketingRoutes.product} className="landing-card landing-card-hover px-5 py-4 text-sm font-medium">
          Обзор продукта →
        </Link>
        <Link href={marketingRoutes.pricing} className="landing-card landing-card-hover px-5 py-4 text-sm font-medium">
          Тарифы →
        </Link>
        <Link href={marketingRoutes.security} className="landing-card landing-card-hover px-5 py-4 text-sm font-medium">
          Безопасность →
        </Link>
        <Link href={marketingRoutes.contact} className="landing-card landing-card-hover px-5 py-4 text-sm font-medium">
          Контакты →
        </Link>
      </nav>
    </MarketingSubpage>
  );
}
