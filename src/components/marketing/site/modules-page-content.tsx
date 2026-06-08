"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Package,
  Radar,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { FeatureIcon } from "@/components/marketing/site/feature-icon";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const copy = marketingSiteContent.modules;

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
  ],
  warehouse: [
    { label: "Заказ-наряды", href: `${marketingRoutes.modules}#work-orders` },
    { label: "Как работает", href: `${marketingRoutes.home}#story` },
  ],
  "work-orders": [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Документы", href: `${marketingRoutes.home}#documents` },
  ],
  accounting: [
    { label: "Mission Control", href: `${marketingRoutes.modules}#mission-control` },
    { label: "Безопасность", href: marketingRoutes.security },
  ],
  inventory: [
    { label: "Склад", href: `${marketingRoutes.modules}#warehouse` },
    { label: "Документы", href: `${marketingRoutes.home}#documents` },
  ],
  employees: [
    { label: "Безопасность", href: marketingRoutes.security },
    { label: "Демо", href: `${marketingRoutes.home}#demo` },
  ],
};

export function ModulesPageContent() {
  const [activeId, setActiveId] = useState<string>(copy.items[0]?.id ?? "");

  useEffect(() => {
    const sections = copy.items
      .map((m) => document.getElementById(m.id))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="marketing-stats-row">
        {copy.stats.map((stat) => (
          <div key={stat.label} className="marketing-stat">
            <p className="marketing-stat-value">{stat.value}</p>
            <p className="marketing-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="landing-lead mt-10 max-w-3xl">{copy.intro}</p>

      <div className="marketing-module-overview mt-12">
        <p className="landing-eyebrow mb-4">Быстрый обзор</p>
        <div className="marketing-module-overview-grid">
          {copy.items.map((mod, index) => {
            const Icon = ICONS[mod.id] ?? Radar;
            return (
              <a key={mod.id} href={`#${mod.id}`} className="marketing-module-overview-card group">
                <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="md" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{mod.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{mod.tagline}</span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="marketing-modules-layout mt-16">
        <nav className="marketing-modules-toc" aria-label="Модули">
          <p className="landing-eyebrow mb-4">Содержание</p>
          <ul className="space-y-1">
            {copy.items.map((mod, index) => {
              const Icon = ICONS[mod.id] ?? Radar;
              return (
                <li key={mod.id}>
                  <a
                    href={`#${mod.id}`}
                    className={cn("marketing-modules-toc-link", activeId === mod.id && "is-active")}
                  >
                    <Icon className="size-3.5 shrink-0 opacity-60" aria-hidden />
                    {mod.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="marketing-modules-list">
          {copy.items.map((mod, index) => {
            const Icon = ICONS[mod.id] ?? Radar;
            const related = RELATED[mod.id] ?? [];
            return (
              <article key={mod.id} id={mod.id} className="marketing-module-card scroll-mt-28">
                <div className="marketing-module-card-inner">
                  <div className="marketing-module-card-head">
                    <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="lg" />
                    <div className="min-w-0">
                      <p className="landing-eyebrow">{mod.tagline}</p>
                      <h2 className="marketing-subsection-title mt-2">{mod.title}</h2>
                    </div>
                  </div>

                  <p className="landing-lead mt-5 max-w-3xl">{mod.description}</p>

                  <div className="marketing-module-capabilities mt-8">
                    <h3 className="text-sm font-semibold">Возможности</h3>
                    <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {mod.capabilities.map((cap) => (
                        <li key={cap} className="marketing-check-item">
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="marketing-module-meta mt-6">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">Для кого: </span>
                      <span className="text-muted-foreground">{mod.forWhom}</span>
                    </p>

                    {related.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {related.map((r) => (
                          <Link key={r.href} href={r.href} className="marketing-chip-link">
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
