"use client";

import { useRef } from "react";

import { siteContent } from "@/components/marketing/content/site-content";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";

export function StripeFaq() {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal({ scope: ref, selector: "[data-faq-item]", stagger: 0.06 });

  return (
    <section ref={ref} id="faq" className="stripe-section stripe-section-muted">
      <div className="stripe-container max-w-3xl">
        <p className="stripe-eyebrow">FAQ</p>
        <h2 className="stripe-h2">Вопросы</h2>
        <dl className="mt-10 space-y-0 divide-y divide-border rounded-2xl border border-border bg-card">
          {siteContent.faq.map((item) => (
            <div key={item.q} data-faq-item className="px-6 py-5">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
