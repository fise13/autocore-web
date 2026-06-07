"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useAnimeReveal } from "@/components/marketing/landing/use-anime-reveal";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";

const copy = landingPageContent.faq;

export function LandingFaq() {
  const ref = useRef<HTMLElement>(null);
  useAnimeReveal({ scope: ref });

  return (
    <section ref={ref} id="faq" className="landing-section">
      <div className="landing-container max-w-3xl">
        <header className="text-center">
          <p data-anime-reveal className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-anime-reveal className="landing-display mt-4">
            {copy.title}
          </h2>
        </header>

        <div className="mt-12 space-y-3">
          {copy.items.map((item) => (
            <details
              key={item.q}
              data-anime-reveal
              className="landing-faq-item landing-card group open:border-primary/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-medium">
                {item.q}
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-300"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-border/60 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div data-anime-reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Button render={<Link href={marketingRoutes.pricing} />}>{copy.ctaPricing}</Button>
          <Button variant="outline" render={<Link href={marketingRoutes.contact} />}>
            {copy.ctaContact}
          </Button>
        </div>
      </div>
    </section>
  );
}
