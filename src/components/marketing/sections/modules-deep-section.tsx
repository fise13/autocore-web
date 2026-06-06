"use client";

import Link from "next/link";
import { useRef } from "react";
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
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";
import { SectionShell } from "@/components/marketing/ui/section-shell";
import { marketingRoutes } from "@/lib/marketing-routes";

const ICONS: Record<string, LucideIcon> = {
  "mission-control": Radar,
  warehouse: Warehouse,
  "work-orders": Wrench,
  accounting: Banknote,
  inventory: Package,
  employees: Users,
};

const TONES = ["blue", "green", "amber", "blue", "green", "violet"] as const;

export function ModulesDeepSection() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveal({ scope: scopeRef, selector: "[data-reveal]", stagger: 0.1 });

  return (
    <SectionShell
      id="modules-deep"
      label="Модули"
      title="Каждый модуль — часть одного контура"
      description="Подробности по зонам ответственности. Ссылки ведут на якоря и отдельные страницы каталога."
    >
      <div ref={scopeRef} className="space-y-8">
        {landingCopy.moduleDetails.map((mod, index) => {
          const Icon = ICONS[mod.id] ?? Radar;
          return (
            <article
              key={mod.id}
              id={`module-${mod.id}`}
              data-reveal
              className="autocore-surface-group scroll-mt-28 overflow-hidden"
            >
              <div className="grid gap-8 p-6 md:grid-cols-[auto_1fr] md:p-10">
                <FeatureIcon icon={Icon} tone={TONES[index] ?? "blue"} size="lg" />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">{mod.tagline}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{mod.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{mod.description}</p>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Возможности</h4>
                      <ul className="mt-3 space-y-2">
                        {mod.capabilities.map((cap) => (
                          <li key={cap} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-5">
                      <h4 className="text-sm font-semibold text-foreground">Для кого</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{mod.forWhom}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link href={mod.href} className="text-sm font-medium text-primary hover:underline">
                          На главной →
                        </Link>
                        <Link href={mod.learnMore} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                          Подробнее в каталоге →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        <p data-reveal className="text-center">
          <Link href={marketingRoutes.modules} className="text-base font-medium text-primary hover:underline">
            Полный каталог модулей с перекрёстными ссылками →
          </Link>
        </p>
      </div>
    </SectionShell>
  );
}
