"use client";

import { useState } from "react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { PaddleBuyButton } from "@/components/marketing/pricing/paddle-buy-button";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/i18n/navigation";

export function TrustFaqExperience() {
  const { trust, faq } = useLandingContent();
  const [open, setOpen] = useState<string[]>(["faq-0"]);

  function handleChange(next: string[]) {
    if (next.length === 0) {
      setOpen([]);
      return;
    }
    const latest = next[next.length - 1];
    setOpen(latest ? [latest] : []);
  }

  return (
    <SectionShell className="exp-trust-faq border-t border-border/40" ariaLabelledby="trust-heading">
      <SectionReveal className="mx-auto max-w-2xl text-center">
        <h2 id="trust-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {trust.title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{trust.subtitle}</p>
      </SectionReveal>

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
        {trust.pillars.map((pillar, index) => (
          <SectionReveal key={pillar.title} delay={0.05 + index * 0.05} y={10}>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium">{pillar.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pillar.body}</p>
            </div>
          </SectionReveal>
        ))}
      </div>

      <SectionReveal className="mt-6 text-center" delay={0.18}>
        <Link href={trust.linkHref} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {trust.link}
        </Link>
      </SectionReveal>

      <SectionReveal className="mx-auto mt-20 max-w-2xl" delay={0.06}>
        <h3 id="faq-heading" className="exp-display text-center text-2xl tracking-tight sm:text-3xl">
          {faq.title}
        </h3>
        <p className="mt-3 text-center text-sm text-muted-foreground">{faq.description}</p>

        <Accordion value={open} onValueChange={handleChange} className="mt-8">
          {faq.items.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`} className="border-border/60">
              <AccordionTrigger>
                <span className="text-left text-sm font-medium">{item.q}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrialButton>{faq.ctaPrimary}</TrialButton>
          <PaddleBuyButton size="lg" variant="outline" className="h-10 min-w-[11rem] px-5 text-sm">
            {faq.ctaBuy}
          </PaddleBuyButton>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}
