"use client";

import { Camera, User } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { cn } from "@/lib/utils";

const STEPS = ["intake", "photo", "complete"] as const;

const EVENTS = [
  { time: "09:12", label: "Наряд открыт", user: "Иван М." },
  { time: "11:40", label: "Двигатель снят", user: "Алексей К." },
  { time: "14:05", label: "G4KC установлен", user: "Алексей К." },
] as const;

type RepairTimelineMockProps = {
  className?: string;
  paused?: boolean;
};

export function RepairTimelineMock({ className, paused }: RepairTimelineMockProps) {
  const { step } = useLiveSequence(STEPS, { intervalMs: 2700, paused });

  return (
    <ProductWindow title="История · Sonata NF" live className={className}>
      <div className="exp-timeline">
        {EVENTS.map((event, i) => (
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
                <span className="text-[10px] text-primary">Фото прикреплено</span>
              </div>
            ) : null}
          </div>
        ))}
        {step === "complete" ? (
          <p className="text-[10px] font-medium text-emerald-600">Ремонт завершён · гарантия 180 дн</p>
        ) : null}
      </div>
    </ProductWindow>
  );
}
