"use client";

import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";

export function StripePillars() {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal({ scope: ref, y: 24, stagger: 0.12 });

  return (
    <section ref={ref} className="stripe-section stripe-section-muted">
      <div className="stripe-container">
        <div className="stripe-pillar-grid">
          {siteContent.pillars.map((pillar) => (
            <article key={pillar.title} data-reveal className="stripe-pillar-card">
              <h3 className="text-lg font-semibold tracking-tight">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
