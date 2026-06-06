"use client";

import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";

export function StripePlatform() {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal({ scope: ref });

  return (
    <section ref={ref} id="platform" className="stripe-section">
      <div className="stripe-container text-center">
        <h2 data-reveal className="stripe-h2">
          {siteContent.platform.title}
        </h2>
        <ul data-reveal className="mt-10 flex flex-wrap justify-center gap-4">
          {siteContent.platform.items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
