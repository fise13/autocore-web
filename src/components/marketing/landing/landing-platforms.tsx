"use client";

import { Monitor, Smartphone, Globe } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";

const copy = landingPageContent.platforms;

const ICONS = [Globe, Monitor, Smartphone] as const;

export function LandingPlatforms() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} className="landing-section border-t border-border/80 bg-muted/20">
      <div className="landing-container text-center">
        <p data-anime-reveal className="landing-eyebrow">
          {copy.eyebrow}
        </p>
        <h2 data-anime-reveal className="landing-display mx-auto mt-4 max-w-2xl text-balance">
          {copy.title}
        </h2>
        <p data-anime-reveal className="landing-lead mx-auto mt-5 max-w-xl">
          {copy.description}
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {copy.items.map((item, index) => {
            const Icon = ICONS[index] ?? Globe;
            return (
              <article key={item.name} data-anime-reveal className="landing-card landing-card-hover p-6 text-left">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </article>
            );
          })}
        </div>
        <p data-anime-reveal className="mx-auto mt-8 max-w-lg text-sm text-muted-foreground">
          {copy.footnote}
        </p>
      </div>
    </section>
  );
}
