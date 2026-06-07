"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const copy = landingPageContent.modules;

const SPAN: Record<string, string> = {
  warehouse: "md:col-span-7",
  motors: "md:col-span-5",
  "work-orders": "md:col-span-5",
  accounting: "md:col-span-7",
  "mission-control": "md:col-span-8",
  team: "md:col-span-4",
};

export function LandingModules() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="modules" className="landing-section border-t border-border/80 bg-muted/20">
      <div className="landing-container">
        <header className="max-w-3xl">
          <p data-anime-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-anime-reveal className="landing-display mt-4 text-balance">
            {copy.title}
          </h2>
          <p data-anime-reveal className="landing-lead mt-5 max-w-2xl">
            {copy.description}
          </p>
        </header>

        <div className="landing-bento mt-14">
          {copy.items.map((mod) => (
            <Link
              key={mod.id}
              href={mod.href}
              data-anime-reveal
              className={cn(
                "landing-card landing-card-hover group flex flex-col p-6 md:col-span-6 md:p-8",
                SPAN[mod.id],
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">{mod.tagline}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{mod.title}</h3>
                </div>
                <ArrowUpRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{mod.body}</p>
            </Link>
          ))}
        </div>

        <div data-anime-reveal className="mt-10 flex justify-center">
          <Button size="lg" render={<Link href={marketingRoutes.modules} />}>
            {copy.ctaAll}
            <ArrowUpRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}
