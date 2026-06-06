"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { ArrowRight, FileSpreadsheet, ShieldCheck, TableProperties } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const copy = landingCopy.aiImport;

export function AiImportSection() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!scopeRef.current || reduced) return;
      gsap.from("[data-pipeline-stage]", {
        scrollTrigger: { trigger: scopeRef.current, start: "top 78%" },
        opacity: 0,
        y: 20,
        stagger: 0.12,
        duration: 0.55,
        ease: "power3.out",
      });
    },
    { scope: scopeRef, dependencies: [reduced] },
  );

  return (
    <SectionShell id="ai-import" label={copy.label} title={copy.title} description={copy.description}>
      <div
        ref={scopeRef}
        className="grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center"
      >
        <div data-pipeline-stage className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <FileSpreadsheet className="size-6 text-amber-600" strokeWidth={1.75} />
          <p className="mt-4 font-semibold">{copy.messy}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            АРТИКУЛ · описание · кол-во
            <br />
            ??? · ALT 12v · 42
          </p>
        </div>

        <ArrowRight className="mx-auto hidden size-5 text-primary lg:block" aria-hidden />

        <div
          data-pipeline-stage
          className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center shadow-sm"
        >
          <ShieldCheck className="mx-auto size-6 text-primary" strokeWidth={1.75} />
          <p className="mt-4 font-semibold">{copy.normalize}</p>
          <p className="mt-2 text-sm text-muted-foreground">Сопоставление · валидация · превью</p>
        </div>

        <ArrowRight className="mx-auto hidden size-5 text-primary lg:block" aria-hidden />

        <div
          data-pipeline-stage
          className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm"
        >
          <TableProperties className="size-6 text-emerald-600" strokeWidth={1.75} />
          <p className="mt-4 font-semibold">{copy.structured}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            ALT-12V · Альтернатор 12V · 42 · A-14
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
