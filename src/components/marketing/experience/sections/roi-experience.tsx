"use client";

import { useMemo, useState } from "react";

import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";
import { SectionReveal, SectionShell } from "@/components/marketing/experience/ui/section-shell";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { formatKzt } from "@/lib/marketing/landing-demo-snapshot";

const USD_TO_KZT = 500;

export function RoiExperience() {
  const copy = useLandingContent().roi;
  const [minutes, setMinutes] = useState<number>(copy.defaults.minutes);
  const [rate, setRate] = useState<number>(copy.defaults.rate);
  const [lost, setLost] = useState<number>(copy.defaults.lost);

  const chaosCost = useMemo(() => {
    const dailyHours = minutes / 60;
    const monthlyLabor = dailyHours * 22 * rate;
    return Math.round(monthlyLabor + lost);
  }, [minutes, rate, lost]);

  const subscriptionKzt = 39 * USD_TO_KZT;

  return (
    <SectionShell className="exp-roi border-t border-border/40" ariaLabelledby="roi-heading">
      <SectionReveal className="mx-auto max-w-xl text-center">
        <h2 id="roi-heading" className="exp-display text-3xl tracking-tight sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{copy.subtitle}</p>
      </SectionReveal>

      <SectionReveal className="mx-auto mt-10 max-w-lg space-y-5" delay={0.08}>
        <SliderField
          label={copy.minutesLabel}
          value={minutes}
          min={15}
          max={120}
          step={5}
          display={`${minutes} ${copy.minutesUnit}`}
          onChange={setMinutes}
        />
        <SliderField
          label={copy.rateLabel}
          value={rate}
          min={2000}
          max={15000}
          step={500}
          display={`${formatKzt(rate)} ₸`}
          onChange={setRate}
        />
        <SliderField
          label={copy.lostLabel}
          value={lost}
          min={0}
          max={300000}
          step={10000}
          display={`${formatKzt(lost)} ₸`}
          onChange={setLost}
        />

        <div className="rounded-xl border border-border/70 bg-muted/15 p-4 text-center">
          <p className="text-xs text-muted-foreground">{copy.resultLabel}</p>
          <p className="exp-display mt-1 text-3xl tracking-tight">{formatKzt(chaosCost)} ₸</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {copy.vsLabel}: ~{formatKzt(subscriptionKzt)} ₸ / {copy.perMonth} ($39)
          </p>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">{copy.disclaimer}</p>
        <div className="flex justify-center">
          <TrialButton>{copy.cta}</TrialButton>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="exp-mock-mono font-medium text-foreground">{display}</span>
      </div>
      <input
        type="range"
        className="exp-roi-range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
