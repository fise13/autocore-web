"use client";

import { Check, X } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";

const copy = landingPageContent.story;

export function LandingStory() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref, delay: 80 });
  useScrollReveal({ scope: ref, selector: "[data-story-col]", y: 20 });

  return (
    <section ref={ref} id="story" className="landing-section">
      <div className="landing-container">
        <header className="max-w-2xl">
          <p data-anime-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-anime-reveal className="landing-display mt-4">
            {copy.title}
          </h2>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div
            data-story-col
            className="landing-card border-destructive/20 bg-destructive/4 p-6 md:p-8"
          >
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-destructive">
              <X className="size-4" aria-hidden />
              Без единой системы
            </p>
            <ul className="space-y-4">
              {copy.without.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/60" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div
            data-story-col
            className="landing-card border-primary/25 bg-primary/5 p-6 md:p-8"
          >
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-primary">
              <Check className="size-4" aria-hidden />
              {copy.withTitle}
            </p>
            <ul className="space-y-4">
              {copy.with.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
