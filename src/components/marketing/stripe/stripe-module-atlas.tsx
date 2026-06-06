"use client";

import Link from "next/link";
import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";
import { marketingRoutes } from "@/lib/marketing-routes";

export function StripeModuleAtlas() {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal({ scope: ref, selector: "[data-module-row]", stagger: 0.08 });

  return (
    <section ref={ref} id="modules" className="stripe-section">
      <div className="stripe-container">
        <p className="stripe-eyebrow">Справочник</p>
        <h2 className="stripe-h2">Модули AutoCore</h2>
        <p className="stripe-lead max-w-2xl">
          Структурированный обзор зон ответственности. Каждый модуль — часть одного контура; ссылки ведут в
          развёрнутый каталог.
        </p>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {siteContent.modules.map((mod) => (
            <article
              key={mod.id}
              id={`atlas-${mod.id}`}
              data-module-row
              className="grid gap-6 p-6 md:grid-cols-[200px_1fr_auto] md:items-center md:p-8"
            >
              <div>
                <h3 className="text-lg font-semibold">{mod.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{mod.summary}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {mod.points.map((point) => (
                  <li
                    key={point}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {point}
                  </li>
                ))}
              </ul>
              <Link href={mod.href} className="stripe-link text-sm whitespace-nowrap">
                Подробнее →
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link href={marketingRoutes.modules} className="stripe-link">
            Полный каталог с перекрёстными ссылками →
          </Link>
        </p>
      </div>
    </section>
  );
}
