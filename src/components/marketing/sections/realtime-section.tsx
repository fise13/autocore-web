"use client";

import { useRef } from "react";
import { Radio, RefreshCw, Users, Zap } from "lucide-react";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { RealtimeFeedClient } from "@/components/marketing/sections/realtime-feed-client";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { useScrollReveal } from "@/components/marketing/motion/use-scroll-reveal";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const copy = landingCopy.realtime;
const ICONS = [Zap, Users, RefreshCw, Radio] as const;
const TONES = ["blue", "green", "amber", "violet"] as const;

export function RealtimeSection() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveal({ scope: scopeRef });

  return (
    <SectionShell id="realtime" label={copy.label} title={copy.title} description={copy.description}>
      <div ref={scopeRef}>
        <div data-reveal className="mb-8 flex flex-wrap gap-2">
          {landingCopy.marquee.modules.map((chip) => (
            <span key={chip} className="site-chip site-chip-neutral">
              {chip}
            </span>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.signals.map((item, index) => (
              <div key={item.title} data-reveal>
                <FeatureCard
                  icon={ICONS[index] ?? Zap}
                  tone={TONES[index] ?? "blue"}
                  title={item.title}
                  description={item.body}
                />
              </div>
            ))}
          </div>

          <div data-reveal className="autocore-surface-group min-h-[340px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{copy.feedTitle}</h3>
                <p className="text-sm text-muted-foreground">{copy.feedSubtitle}</p>
              </div>
              <span className="site-chip py-0.5 text-[10px]">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {copy.synced}
              </span>
            </div>
            <RealtimeFeedClient />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
