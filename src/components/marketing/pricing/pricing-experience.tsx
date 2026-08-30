"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { MarketingPaddlePlan } from "@/components/marketing/pricing/marketing-paddle-plan";
import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const EASE = [0.16, 1, 0.3, 1] as const;

type HeroRevealProps = {
  children: ReactNode;
  className?: string;
  delay: number;
  duration: number;
  y?: number;
};

function HeroReveal({ children, className, delay, duration, y = 12 }: HeroRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  margin?: string;
};

function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.6,
  y = 12,
  margin = "-60px",
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function PricingExperience() {
  const pages = useMarketingPages();
  const copy = pages.pricing;
  const [openFaq, setOpenFaq] = useState<string[]>(["faq-0"]);

  function handleFaqChange(next: string[]) {
    if (next.length === 0) {
      setOpenFaq([]);
      return;
    }
    const latest = next[next.length - 1];
    setOpenFaq(latest ? [latest] : []);
  }

  return (
    <div className="pricing-page">
      <section className="pricing-panel pricing-panel-hero" aria-label={pages.breadcrumbs.pricing}>
        <div className="exp-section-inner pricing-panel-inner">
          <HeroReveal delay={0} duration={0.7} y={14}>
            <p className="pricing-kicker">{pages.breadcrumbs.pricing}</p>
            <h1 className="exp-display pricing-hero-title">
              <span className="block">{copy.hero.titleLine1}</span>
              <span className="pricing-hero-title-line2">{copy.hero.titleLine2}</span>
            </h1>
          </HeroReveal>

          <HeroReveal delay={0.1} duration={0.55} y={10}>
            <p className="pricing-hero-lead">{copy.hero.lead}</p>
          </HeroReveal>

          <HeroReveal className="pricing-offer" delay={0.2} duration={0.6} y={14}>
            <MarketingPaddlePlan
              fallbackPrice={copy.plan.price}
              fallbackPeriod={copy.plan.period}
              fallbackYearlyPrice={copy.plan.yearlyPrice}
              fallbackYearlyPeriod={copy.plan.yearlyPeriod}
              monthlyLabel={copy.plan.monthlyLabel}
              yearlyLabel={copy.plan.yearlyLabel}
              intervalAriaLabel={copy.plan.intervalAria}
              note={copy.plan.note}
              yearlySaveLabel={copy.plan.yearlySave}
              buyLabel={copy.cta.buy}
              buyVariant="default"
              priceClassName="pricing-hero-amount"
              secondaryAction={<TrialButton variant="outline">{copy.cta.primary}</TrialButton>}
            />
            <p className="pricing-hero-note">
              {copy.cta.trialDays}. {copy.cta.noCard}.
            </p>
          </HeroReveal>
        </div>
      </section>

      <section className="pricing-panel pricing-panel-included" aria-labelledby="pricing-included-heading">
        <div className="exp-section-inner pricing-panel-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-included-heading" className="pricing-section-kicker">
              {copy.included.title}
            </h2>
          </ScrollReveal>

          <ol className="pricing-included-grid">
            {copy.included.items.map((item, index) => (
              <li key={item} className="pricing-included-row">
                <ScrollReveal
                  className="pricing-included-reveal"
                  delay={0.03 + index * 0.04}
                  y={8}
                  margin="-40px"
                >
                  <span className="pricing-included-index" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pricing-included-item">{item}</span>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pricing-panel pricing-panel-copy" aria-labelledby="pricing-philosophy-heading">
        <div className="exp-section-inner pricing-panel-inner pricing-philosophy-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-philosophy-heading" className="pricing-section-kicker">
              {copy.philosophy.title}
            </h2>
          </ScrollReveal>

          <ScrollReveal className="pricing-philosophy-statement-wrap" delay={0.06} y={12} margin="-60px">
            <p className="pricing-philosophy-statement">{copy.philosophy.statement}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.1} y={8} margin="-50px">
            <p className="pricing-philosophy-body">{copy.philosophy.body}</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="pricing-panel pricing-panel-copy" aria-labelledby="pricing-faq-heading">
        <div className="exp-section-inner pricing-panel-inner pricing-faq-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-faq-heading" className="pricing-section-kicker">
              {copy.faqTitle}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.06} margin="-50px">
            <Accordion value={openFaq} onValueChange={handleFaqChange} className="pricing-faq-accordion">
              {copy.faq.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`} className="pricing-faq-item">
                  <AccordionTrigger>
                    <span className="pricing-faq-question">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pricing-faq-answer">{item.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </section>

      <section className="pricing-panel pricing-panel-close" aria-labelledby="pricing-close-heading">
        <div className="exp-section-inner pricing-panel-inner pricing-close-inner">
          <ScrollReveal margin="-80px" y={12}>
            <h2 id="pricing-close-heading" className="exp-display pricing-close-title">
              {copy.closing.line}
            </h2>
          </ScrollReveal>

          <ScrollReveal className="pricing-close-cta" delay={0.08} y={8} margin="-50px">
            <TrialButton>{copy.closing.button}</TrialButton>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
