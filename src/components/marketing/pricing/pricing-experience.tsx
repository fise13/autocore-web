"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { storePendingBillingIntent } from "@/lib/marketing/pending-billing-intent";
import { marketingTrialSignupUrl } from "@/lib/marketing/trial-signup-url";

const copy = marketingSiteContent.pricing;
const EASE = [0.16, 1, 0.3, 1] as const;

type HeroRevealProps = {
  children: ReactNode;
  className?: string;
  delay: number;
  duration: number;
  y?: number;
};

function HeroReveal({ children, className, delay, duration, y = 18 }: HeroRevealProps) {
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
  duration = 0.55,
  y = 16,
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

function startTrialSignup() {
  storePendingBillingIntent({ type: "trial" });
  window.location.href = marketingTrialSignupUrl();
}

export function PricingExperience() {
  const reduced = useReducedMotion();
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
      <section className="pricing-panel pricing-panel-hero" aria-label="Тариф">
        <motion.div
          className="pricing-fragment"
          aria-hidden
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 0.05, y: 0 }}
          transition={{ duration: 0.82, delay: 1.02, ease: EASE }}
        >
          <div className="pricing-fragment-bar w-[38%]" />
          <div className="pricing-fragment-bar mt-3 w-full" />
          <div className="pricing-fragment-bar mt-2 w-[64%]" />
        </motion.div>

        <div className="exp-section-inner pricing-panel-inner">
          <HeroReveal delay={0} duration={0.72} y={22}>
            <h1 className="exp-display pricing-hero-title">
              <span className="block">{copy.hero.titleLine1}</span>
            </h1>
          </HeroReveal>

          <HeroReveal className="pricing-hero-title-line2" delay={0.38} duration={0.58} y={16}>
            <p className="exp-display text-muted-foreground">{copy.hero.titleLine2}</p>
          </HeroReveal>

          <HeroReveal delay={0.55} duration={0.62} y={20}>
            <div className="pricing-hero-price">
              <span className="exp-display pricing-hero-amount">{copy.plan.price}</span>
              <span className="pricing-hero-period">{copy.plan.period}</span>
            </div>
          </HeroReveal>

          <HeroReveal delay={0.64} duration={0.5} y={12}>
            <p className="pricing-hero-note">{copy.plan.note}</p>
          </HeroReveal>

          <HeroReveal className="pricing-hero-cta" delay={0.72} duration={0.48} y={14}>
            <Button size="lg" className="h-10 min-w-[11rem] px-5 text-sm" onClick={startTrialSignup}>
              {copy.cta.primary}
            </Button>
            <p className="pricing-hero-trust">
              {copy.cta.trialDays}. {copy.cta.noCard}.
            </p>
          </HeroReveal>
        </div>
      </section>

      <section className="pricing-panel" aria-labelledby="pricing-included-heading">
        <div className="exp-section-inner pricing-panel-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-included-heading" className="exp-display pricing-included-title">
              {copy.included.title}
            </h2>
          </ScrollReveal>

          <ul className="pricing-checklist">
            {copy.included.items.map((item, index) => (
              <li key={item}>
                <ScrollReveal delay={0.08 + index * 0.05} y={14} margin="-40px">
                  <span className="pricing-checklist-item">{item}</span>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pricing-panel" aria-labelledby="pricing-philosophy-heading">
        <div className="exp-section-inner pricing-panel-inner pricing-philosophy-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-philosophy-heading" className="exp-display pricing-philosophy-kicker">
              {copy.philosophy.title}
            </h2>
          </ScrollReveal>

          <ScrollReveal className="pricing-philosophy-statement-wrap" delay={0.08} y={18} margin="-60px">
            <p className="pricing-philosophy-statement">{copy.philosophy.statement}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.14} y={12} margin="-50px">
            <p className="pricing-philosophy-body">{copy.philosophy.body}</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="pricing-panel" aria-labelledby="pricing-faq-heading">
        <div className="exp-section-inner pricing-panel-inner pricing-faq-inner">
          <ScrollReveal margin="-80px">
            <h2 id="pricing-faq-heading" className="exp-display pricing-faq-title">
              Вопросы об оплате
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
          <ScrollReveal margin="-80px" y={14}>
            <h2 id="pricing-close-heading" className="exp-display pricing-close-title">
              {copy.closing.line}
            </h2>
          </ScrollReveal>

          <ScrollReveal className="pricing-close-cta" delay={0.12} y={10} margin="-50px">
            <Button size="lg" className="h-10 min-w-[11rem] px-5 text-sm" onClick={startTrialSignup}>
              {copy.closing.button}
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
