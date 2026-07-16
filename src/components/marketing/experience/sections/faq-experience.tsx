"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const copy = landingContent.faq;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Visible FAQ on home so FAQPage JSON-LD matches on-page content (Google + Yandex). */
export function FaqExperience() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<string[]>(["faq-0"]);

  return (
    <section className="exp-section border-t border-border/40" aria-labelledby="home-faq-heading">
      <div className="exp-section-inner max-w-3xl">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h2 id="home-faq-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </motion.div>

        <motion.div
          className="mt-10"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
        >
            <Accordion
              multiple
              value={open}
              onValueChange={(next) => setOpen(Array.isArray(next) ? next : next ? [next] : [])}
              className="w-full"
            >
            {copy.items.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
