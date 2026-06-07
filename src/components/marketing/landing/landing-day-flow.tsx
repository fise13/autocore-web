"use client";

import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";

const copy = landingPageContent.day;

export function LandingDayFlow() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="day" className="landing-section">
      <div className="landing-container">
        <header className="max-w-2xl">
          <p data-anime-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-anime-reveal className="landing-display mt-4">
            {copy.title}
          </h2>
        </header>

        <div className="landing-day-scroll mt-12 -mx-1 px-1">
          {copy.steps.map((step, index) => (
            <article
              key={step.time}
              data-anime-reveal
              className="landing-card landing-card-hover relative p-6"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="font-mono text-xs font-semibold tracking-wider text-primary">{step.time}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {index < copy.steps.length - 1 ? (
                <span
                  className="absolute top-1/2 -right-3 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground md:flex"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
