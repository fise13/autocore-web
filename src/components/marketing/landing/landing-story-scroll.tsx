"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";

gsap.registerPlugin(ScrollTrigger);

const copy = landingPageContent.story;

export function LandingStoryScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGsapSplitHeading(sectionRef, "[data-story-heading]");
  useGsapReveal(sectionRef, "[data-story-intro]");

  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root || reduced) return;

      const steps = gsap.utils.toArray<HTMLElement>("[data-story-step]");

      steps.forEach((step) => {
        gsap.fromTo(
          step,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: step,
              start: "top 82%",
              end: "top 55%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section ref={sectionRef} id="story" className="landing-section landing-section-story">
      <div className="landing-container">
        <header className="landing-section-header max-w-3xl">
          <p data-story-intro className="landing-eyebrow">
            {copy.eyebrow}
          </p>
          <h2 data-story-heading className="landing-section-title mt-4">
            {copy.title}
          </h2>
          <p data-story-intro className="landing-lead mt-5 max-w-2xl">
            {copy.description}
          </p>
        </header>

        <ol className="landing-story-steps-list mt-16 md:mt-20">
          {copy.steps.map((step, index) => (
            <li key={step.id} data-story-step className="landing-story-step">
              <div className="landing-story-step-marker" aria-hidden>
                <span className="landing-story-step-num">{step.label}</span>
                {index < copy.steps.length - 1 ? <span className="landing-story-step-line" /> : null}
              </div>
              <div className="landing-story-step-body">
                <h3 className="landing-story-step-title">{step.title}</h3>
                <p className="landing-lead mt-3">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
