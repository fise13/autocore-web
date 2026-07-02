"use client";

import { Car, FileText, Wrench } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = ["scan", "card", "link", "history"] as const;

type VehicleCardMockProps = {
  className?: string;
  paused?: boolean;
  externalStep?: (typeof STEPS)[number];
};

export function VehicleCardMock({ className, paused, externalStep }: VehicleCardMockProps) {
  const { step: autoStep } = useLiveSequence(STEPS, { intervalMs: 2600, paused: paused || !!externalStep });
  const step = externalStep ?? autoStep;

  return (
    <ProductWindow title="Автомобиль · KMHGC41DPEU123456" live className={className}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300",
                step === "scan" ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              <Car className="size-4 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">Hyundai Sonata NF</p>
              <p className="exp-mock-mono text-[10px] text-muted-foreground">2011 · 2.4L · серый</p>
            </div>
          </div>
          <Badge variant="outline" className="font-normal">
            {step === "scan" ? "Скан…" : "В базе"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetaCell label="VIN" value="KMHGC41…" highlight={step === "scan"} />
          <MetaCell label="Пробег" value="142 800 км" />
        </div>

        <div className="flex flex-col gap-1.5">
          <LinkedRow
            icon={Wrench}
            label="Наряд НЗ-2026-0142"
            sub="Замена G4KC"
            active={step === "link" || step === "history"}
          />
          <LinkedRow
            icon={FileText}
            label="Гарантия G4KC"
            sub="180 дней"
            active={step === "history"}
          />
        </div>

        {step === "history" ? (
          <p className="text-center text-[10px] font-medium text-emerald-600">
            История ремонта доступна цеху и офису
          </p>
        ) : null}
      </div>
    </ProductWindow>
  );
}

function MetaCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 transition-colors duration-300",
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20",
      )}
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="exp-mock-mono mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}

function LinkedRow({
  icon: Icon,
  label,
  sub,
  active,
}: {
  icon: typeof Wrench;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-300",
        active ? "border-primary/35 bg-primary/5" : "border-border opacity-50",
      )}
    >
      <Icon className="size-3.5 text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
