"use client";

import { Check, Circle, Wrench } from "lucide-react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
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
  const chrome = useDemoChrome();
  const { step: autoStep } = useLiveSequence(STEPS, { intervalMs: 2800, paused: paused || !!externalStep });
  const step = externalStep ?? autoStep;

  return (
    <ProductWindow title={chrome.workOrder.title} live className={className}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="exp-mock-mono text-xs font-semibold text-primary">{chrome.workOrder.number}</p>
            <p className="text-sm font-medium">Hyundai Sonata NF</p>
            <p className="text-[10px] text-muted-foreground">{chrome.workOrder.engineSwap}</p>
          </div>
          <Badge variant={step === "close" ? "default" : "secondary"}>
            {step === "close"
              ? chrome.common.closed
              : step === "reserve"
                ? chrome.common.inProgress
                : chrome.common.newStatus}
          </Badge>
        </div>

        <ul className="space-y-2">
          <StepItem
            done={step !== "create"}
            active={step === "create"}
            label={chrome.workOrder.stepCreate}
          />
          <StepItem
            done={step === "close"}
            active={step === "reserve"}
            label={chrome.workOrder.stepReserve}
          />
          <StepItem
            done={step === "close"}
            active={step === "close"}
            label={chrome.workOrder.stepClose}
          />
        </ul>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">{chrome.common.total}</span>
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
