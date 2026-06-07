"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Users, Warehouse, Wrench } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const copy = landingPageContent.audience;

const ICONS = {
  warehouse: Warehouse,
  wrench: Wrench,
  chart: BarChart3,
  users: Users,
} as const;

export function LandingAudience() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="for-whom" className="landing-section border-t border-border/80 bg-muted/25">
      <div className="landing-container">
        <header className="mx-auto max-w-3xl text-center">
          <p data-anime-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-anime-reveal className="landing-display mt-4 text-balance">
            {copy.title}
          </h2>
          <p data-anime-reveal className="landing-lead mx-auto mt-5 max-w-2xl">
            {copy.description}
          </p>
        </header>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {copy.personas.map((persona) => {
            const Icon = ICONS[persona.icon];
            return (
              <article
                key={persona.title}
                data-anime-reveal
                className={cn("landing-card landing-card-hover p-6 md:p-8")}
              >
                <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{persona.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/80">Боль: </span>
                  {persona.pain}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-primary">Решение: </span>
                  {persona.promise}
                </p>
              </article>
            );
          })}
        </div>

        <div data-anime-reveal className="mt-10 text-center">
          <Button variant="outline" render={<Link href={marketingRoutes.product} />}>
            {copy.cta}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}
