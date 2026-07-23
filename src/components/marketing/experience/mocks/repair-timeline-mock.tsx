"use client";

import { useMemo } from "react";
import { Camera, User } from "lucide-react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { cn } from "@/lib/utils";

const STEPS = ["intake", "photo", "complete"] as const;

type RepairTimelineMockProps = {
  className?: string;
  paused?: boolean;
};

export function RepairTimelineMock({ className, paused }: RepairTimelineMockProps) {
  const chrome = useDemoChrome();
  const { step } = useLiveSequence(STEPS, { intervalMs: 2700, paused });

  const events = useMemo(
    () =>
      [
        { time: "09:12", label: chrome.repair.orderOpened, user: chrome.repair.userIvan },
        { time: "11:40", label: chrome.repair.engineRemoved, user: chrome.repair.userAlexey },
        { time: "14:05", label: chrome.repair.g4kcInstalled, user: chrome.repair.userAlexey },
      ] as const,
    [chrome.repair],
  );

  return (
    <ProductWindow title={chrome.repair.title} live className={className}>
      <div className="exp-timeline">
        {events.map((event, i) => (
          <div
            key={event.time}
            className={cn(
              "exp-timeline-item",
              step === "photo" && i === 1 && "opacity-100",
              step === "intake" && i > 0 && "opacity-40",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{event.label}</p>
              <span className="exp-mock-mono text-[10px] text-muted-foreground">{event.time}</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="size-2.5" aria-hidden />
              {event.user}
            </p>
            {step === "photo" && i === 1 ? (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2">
                <Camera className="size-4 text-primary" aria-hidden />
                <span className="text-[10px] text-primary">{chrome.repair.photoAttached}</span>
              </div>
            ) : null}
          </div>
        ))}
        {step === "complete" ? (
          <p className="text-[10px] font-medium text-emerald-600">{chrome.repair.repairDone}</p>
        ) : null}
      </div>
    </ProductWindow>
  );
}
