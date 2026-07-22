"use client";

import { useState } from "react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { DevicesSyncSurface } from "@/components/marketing/experience/surfaces/devices-sync-surface";
import { DocumentSurface } from "@/components/marketing/experience/surfaces/document-surface";
import { MotorsSurface } from "@/components/marketing/experience/surfaces/motors-surface";
import { WorkOrderSurface } from "@/components/marketing/experience/surfaces/work-order-surface";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { cn } from "@/lib/utils";

export function ProofScenesExperience() {
  const copy = useLandingContent().scenes;
  const [active, setActive] = useState(0);
  const scene = copy.items[active] ?? copy.items[0];

  return (
    <SectionShell className="exp-scenes border-t border-border/40" ariaLabelledby="scenes-heading">
      <SectionReveal className="mx-auto max-w-2xl text-center">
        <h2 id="scenes-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.subtitle}</p>
      </SectionReveal>

      <SectionReveal className="mt-8 flex flex-wrap justify-center gap-2" delay={0.06}>
        {copy.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-lg border px-4 py-2 text-sm transition-colors",
              index === active
                ? "border-foreground/20 bg-foreground text-background"
                : "border-border/70 text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActive(index)}
          >
            {item.tab}
          </button>
        ))}
      </SectionReveal>

      <SectionReveal className="mx-auto mt-8 max-w-3xl" delay={0.1}>
        <h3 className="text-center text-lg font-medium tracking-tight sm:text-xl">{scene.title}</h3>
        <div className="mt-3 flex flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground sm:flex-row sm:gap-3">
          <span>
            {copy.beforeLabel}: {scene.before}
          </span>
          <span className="hidden sm:inline" aria-hidden>
            →
          </span>
          <span className="text-foreground">
            {copy.afterLabel}: {scene.after}
          </span>
        </div>
        <div className="mt-6">
          <SceneVisual id={scene.id} />
        </div>
      </SectionReveal>

      <SectionReveal className="mt-10 text-center" delay={0.14}>
        <TrialButton>{copy.cta}</TrialButton>
      </SectionReveal>

      <SectionReveal className="exp-devices-epilogue mt-20 border-t border-border/40 pt-16" delay={0.08}>
        <div className="mx-auto max-w-xl text-center">
          <h3 className="exp-display text-2xl tracking-tight sm:text-3xl">{copy.devices.title}</h3>
          <p className="mt-3 text-sm text-muted-foreground">{copy.devices.subtitle}</p>
        </div>
        <div className="mx-auto mt-10 max-w-4xl">
          <DevicesSyncSurface />
        </div>
      </SectionReveal>
    </SectionShell>
  );
}

function SceneVisual({ id }: { id: string }) {
  switch (id) {
    case "order":
      return <WorkOrderSurface orderId="demo-wo-0148" />;
    case "motor":
      return <DocumentSurface />;
    case "warehouse":
    default:
      return <MotorsSurface variant="scene" highlight="inventory" />;
  }
}
