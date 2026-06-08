"use client";

import { useRef } from "react";
import { X, Check } from "lucide-react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";

const copy = landingPageContent.compare;

export function LandingCompare() {
  const ref = useRef<HTMLElement>(null);

  useGsapSplitHeading(ref, "[data-compare-heading]");
  useGsapReveal(ref, "[data-compare-card]", { stagger: 0.12 });

  return (
    <section ref={ref} id="compare" className="landing-section landing-section-compare">
      <div className="landing-container">
        <div className="landing-section-header text-center">
          <p className="landing-eyebrow">{copy.eyebrow}</p>
          <h2 data-compare-heading className="landing-section-title mx-auto mt-4 max-w-2xl">
            {copy.title}
          </h2>
          <p className="landing-lead mx-auto mt-5 max-w-xl">{copy.description}</p>
        </div>

        <div className="landing-compare-grid mt-16">
          <div data-compare-card className="landing-compare-col landing-compare-excel">
            <div className="landing-compare-col-header">
              <span className="landing-compare-label">{copy.excel.label}</span>
            </div>
            <ul className="landing-compare-list">
              {copy.excel.items.map((item) => (
                <li key={item.pain} className="landing-compare-item">
                  <span className="landing-compare-icon is-negative" aria-hidden>
                    <X className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{item.pain}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div data-compare-card className="landing-compare-col landing-compare-autocore">
            <div className="landing-compare-col-header">
              <span className="landing-compare-label">{copy.autocore.label}</span>
            </div>
            <ul className="landing-compare-list">
              {copy.autocore.items.map((item) => (
                <li key={item.win} className="landing-compare-item">
                  <span className="landing-compare-icon is-positive" aria-hidden>
                    <Check className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{item.win}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
