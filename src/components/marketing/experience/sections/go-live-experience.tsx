"use client";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { Button } from "@/components/ui/button";

export function GoLiveExperience() {
  const copy = useLandingContent().goLive;

  return (
    <SectionShell className="exp-golive border-t border-border/40" ariaLabelledby="golive-heading">
      <SectionReveal className="mx-auto max-w-2xl text-center">
        <h2 id="golive-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.subtitle}</p>
      </SectionReveal>

      <ol className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
        {copy.steps.map((step, index) => (
          <SectionReveal key={step.label} delay={0.06 + index * 0.06} y={12}>
            <li className="text-center sm:text-left">
              <p className="exp-mock-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm font-medium">{step.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            </li>
          </SectionReveal>
        ))}
      </ol>

      <SectionReveal className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" delay={0.2}>
        <TrialButton>{copy.primary}</TrialButton>
        <Button
          size="lg"
          variant="outline"
          className="h-10 min-w-[11rem] px-5 text-sm"
          render={<a href="mailto:support@myautocore.com" />}
          nativeButton={false}
        >
          {copy.secondary}
        </Button>
      </SectionReveal>
    </SectionShell>
  );
}
