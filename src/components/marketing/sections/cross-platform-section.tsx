"use client";

import { Laptop, Monitor, Smartphone } from "lucide-react";
import { useRef } from "react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import {
  useGsapReveal,
  useGsapSplitHeading,
  useGsapStaggerChildren,
} from "@/components/marketing/motion/use-gsap-reveal";
import { FeatureCard } from "@/components/marketing/site/feature-card";

const copy = landingCopy.platform;
const ICONS = [Monitor, Laptop, Smartphone] as const;

export function CrossPlatformSection() {
  const ref = useRef<HTMLElement>(null);
  useGsapSplitHeading(ref, "[data-platform-heading]");
  useGsapReveal(ref, "[data-platform-reveal]", { stagger: 0.08 });
  useGsapStaggerChildren(ref, "[data-platform-cards]", "[data-platform-card]", { stagger: 0.1, y: 24 });

  return (
    <section ref={ref} id="platform" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <header className="mx-auto mb-12 max-w-2xl text-center md:mb-14">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase" data-platform-reveal>
            {copy.label}
          </p>
          <h2
            data-platform-heading
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg" data-platform-reveal>
            {copy.description}
          </p>
        </header>

        <div className="mb-10 flex flex-wrap justify-center gap-2" data-platform-reveal>
          {landingCopy.marquee.platforms.map((name) => (
            <span key={name} className="site-chip site-chip-neutral px-4 py-2 text-sm">
              {name}
            </span>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3" data-platform-cards>
          {copy.items.map((platform, index) => (
            <div key={platform.name} data-platform-card>
              <FeatureCard
                icon={ICONS[index] ?? Monitor}
                tone="blue"
                title={platform.name}
                description={platform.detail}
              />
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground" data-platform-reveal>
          {copy.footnote}
        </p>
      </div>
    </section>
  );
}
