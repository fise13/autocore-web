"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { PhilosophyTransformationStrip } from "@/components/marketing/experience/mocks/philosophy-transformation-strip";
import { PhilosophyWorkflowPanel } from "@/components/marketing/experience/mocks/philosophy-workflow-panel";

const copy = landingContent.philosophy;
const EASE = [0.16, 1, 0.3, 1] as const;

export function OsPhilosophy() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const demosInView = useInView(sectionRef, { margin: "-15% 0px", amount: 0.2 });
  const [primaryWorkflow, ...secondaryWorkflows] = copy.workflows;

  return (
    <section ref={sectionRef} id="philosophy" className="exp-section exp-philosophy border-t border-border/40">
      <div className="exp-section-inner">
        <motion.header
          className="max-w-2xl"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <h2 className="exp-display text-3xl tracking-tight sm:text-4xl lg:text-[2.75rem]">{copy.title}</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {copy.description}
          </p>
        </motion.header>

        <PhilosophyTransformationStrip className="mt-12" />

        <div className="mt-10 flex flex-col gap-5">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.06, ease: EASE }}
          >
            <PhilosophyWorkflowPanel
              title={primaryWorkflow.title}
              steps={primaryWorkflow.steps}
              intervalMs={primaryWorkflow.intervalMs}
              initialIndex={primaryWorkflow.initialIndex}
              paused={!demosInView}
            />
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-2">
            {secondaryWorkflows.map((workflow, i) => (
              <motion.div
                key={workflow.id}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE }}
              >
                <PhilosophyWorkflowPanel
                  title={workflow.title}
                  steps={workflow.steps}
                  intervalMs={workflow.intervalMs}
                  initialIndex={workflow.initialIndex}
                  paused={!demosInView}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          className="exp-display mt-14 max-w-2xl text-xl tracking-tight text-foreground/90 sm:text-2xl"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
        >
          {copy.conclusion}
        </motion.p>
      </div>
    </section>
  );
}
