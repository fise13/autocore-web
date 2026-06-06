"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

const copy = siteContent.process;

export function StripeProcess() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      gsap.from("[data-step]", {
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
        opacity: 0,
        y: 16,
        stagger: 0.07,
        duration: 0.5,
        ease: "power2.out",
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} id="process" className="stripe-section stripe-section-muted">
      <div className="stripe-container">
        <p className="stripe-eyebrow">{copy.label}</p>
        <h2 className="stripe-h2">{copy.title}</h2>
        <div className="mt-12 flex flex-wrap gap-3 md:flex-nowrap md:justify-between">
          {copy.steps.map((step, i) => (
            <div key={step.name} data-step className="stripe-process-step">
              <span className="stripe-process-index">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-2 font-semibold">{step.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
