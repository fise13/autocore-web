"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Landmark,
  Package,
  ScrollText,
  Wrench,
} from "lucide-react";
import { useRef } from "react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const copy = landingCopy.workflow;
const ICONS = [Package, Wrench, ClipboardList, Landmark, FileText, ScrollText] as const;

export function WorkflowSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track || reduced) return;

      const distance = () => Math.max(0, track.scrollWidth - section.clientWidth + 32);

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          end: () => `+=${distance() * 0.85}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      gsap.from(track.querySelectorAll("[data-flow-step]"), {
        opacity: 0,
        scale: 0.94,
        stagger: 0.08,
        duration: 0.5,
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <SectionShell id="workflows" label={copy.label} title={copy.title} description={copy.description}>
      <div ref={sectionRef} className="site-workflow-scrub overflow-hidden rounded-2xl border border-border bg-muted/20 p-4 md:p-6">
        <div ref={trackRef} className="flex w-max items-stretch gap-3 pr-8">
          {copy.steps.map((step, index) => {
            const Icon = ICONS[index] ?? Package;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <Link
                  href={step.href}
                  data-flow-step
                  className="site-flow-step flex w-[200px] flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 md:w-[220px]"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </div>
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                  <span className="text-xs font-medium text-primary">Подробнее →</span>
                </Link>
                {index < copy.steps.length - 1 ? (
                  <ArrowRight className="size-4 shrink-0 text-primary/40" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-8 text-center text-muted-foreground">{copy.footnote}</p>
    </SectionShell>
  );
}
