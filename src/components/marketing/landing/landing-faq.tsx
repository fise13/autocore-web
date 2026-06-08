"use client";

import { useRef } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingFaq } from "@/components/marketing/site/marketing-faq";
import { useGsapReveal } from "@/components/marketing/motion/use-gsap-reveal";

const faq = marketingSiteContent.faq;

export function LandingFaq() {
  const ref = useRef<HTMLElement>(null);
  useGsapReveal(ref, "[data-faq-reveal]");

  return (
    <section ref={ref} id="faq" className="landing-section landing-section-muted">
      <div className="landing-container">
        <header className="marketing-subsection-header max-w-2xl">
          <p data-faq-reveal className="landing-eyebrow">
            {faq.title}
          </p>
          <h2 data-faq-reveal className="landing-section-title mt-4">
            Честные ответы перед стартом
          </h2>
          <p data-faq-reveal className="landing-lead mt-5">
            {faq.description}
          </p>
        </header>
        <div data-faq-reveal className="mt-10 md:mt-12">
          <MarketingFaq />
        </div>
      </div>
    </section>
  );
}
