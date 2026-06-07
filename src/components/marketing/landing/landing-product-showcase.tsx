"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { OperationalPreview } from "@/components/marketing/ui/operational-preview";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingPageContent.showcase;

export function LandingProductShowcase() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="showcase" className="landing-section border-t border-border/80">
      <div className="landing-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
          <div>
            <p data-anime-reveal className="landing-eyebrow">
              {copy.eyebrow}
            </p>
            <h2 data-anime-reveal className="landing-display mt-4 text-balance">
              {copy.title}
            </h2>
            <p data-anime-reveal className="landing-lead mt-5">
              {copy.description}
            </p>
            <ul data-anime-reveal className="mt-8 space-y-3">
              {copy.highlights.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div data-anime-reveal className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href={marketingRoutes.product} />}>
                {copy.ctaProduct}
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Button>
              <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />}>
                {copy.ctaModules}
              </Button>
            </div>
          </div>

          <div data-anime-reveal className="relative">
            <div className="landing-card overflow-hidden p-1">
              <OperationalPreview large />
            </div>
            <Link
              href={marketingRoutes.product}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Play className="size-3.5" aria-hidden />
              Полный обзор продукта
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
