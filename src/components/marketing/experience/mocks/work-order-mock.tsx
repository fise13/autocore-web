"use client";

import { Check, Circle, Wrench } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = ["create", "reserve", "close"] as const;

type WorkOrderMockProps = {
  className?: string;
  paused?: boolean;
  externalStep?: (typeof STEPS)[number];
};

export function WorkOrderMock({ className, paused, externalStep }: WorkOrderMockProps) {
  const { step: autoStep } = useLiveSequence(STEPS, { intervalMs: 2800, paused: paused || !!externalStep });
  const step = externalStep ?? autoStep;

  return (
    <ProductWindow title="Наряды · НЗ-2026-0142" live className={className}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="exp-mock-mono text-xs font-semibold text-primary">НЗ-2026-0142</p>
            <p className="text-sm font-medium">Hyundai Sonata NF</p>
            <p className="text-[10px] text-muted-foreground">Замена двигателя G4KC</p>
          </div>
          <Badge variant={step === "close" ? "default" : "secondary"}>
            {step === "close" ? "Закрыт" : step === "reserve" ? "В работе" : "Новый"}
          </Badge>
        </div>

        <ul className="space-y-2">
          <StepItem done={step !== "create"} active={step === "create"} label="Создание наряда" />
          <StepItem
            done={step === "close"}
            active={step === "reserve"}
            label="Резерв G4KC · полка A-12"
          />
          <StepItem done={step === "close"} active={step === "close"} label="Списание и закрытие" />
        </ul>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">Итого</span>
          <span className="exp-mock-mono text-sm font-semibold">$6,110</span>
        </div>
      </div>
    </ProductWindow>
  );
}

function StepItem({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {done ? (
        <Check className="size-3.5 text-emerald-500" aria-hidden />
      ) : active ? (
        <Wrench className="size-3.5 text-primary" aria-hidden />
      ) : (
        <Circle className="size-3.5 text-muted-foreground/50" aria-hidden />
      )}
      <span className={cn(done ? "text-muted-foreground" : active ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </li>
  );
}
