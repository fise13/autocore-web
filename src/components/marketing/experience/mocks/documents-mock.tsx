"use client";

import { FileText, Printer, QrCode } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { cn } from "@/lib/utils";

const STEPS = ["preview", "print", "qr"] as const;

type DocumentsMockProps = {
  className?: string;
  paused?: boolean;
};

export function DocumentsMock({ className, paused }: DocumentsMockProps) {
  const { step } = useLiveSequence(STEPS, { intervalMs: 2800, paused });

  return (
    <ProductWindow title="Документы · Гарантия G4KC" className={className}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Гарантийный талон</p>
            <p className="exp-mock-mono text-[10px] text-muted-foreground">НЗ-2026-0142 · 180 дней</p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border bg-card p-3 transition-all",
            step === "preview" ? "border-primary/40 shadow-sm" : "border-border",
          )}
        >
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <p>Двигатель: G4KC · SN KMHGC41…</p>
            <p>Автомобиль: Hyundai Sonata NF</p>
            <p>Пробег при установке: 142 800 км</p>
          </div>
          {step === "qr" ? (
            <div className="mt-3 flex items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-4">
              <QrCode className="size-10 text-foreground" aria-hidden />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs">
          <Printer
            className={cn("size-3.5", step === "print" && "animate-pulse text-primary")}
            aria-hidden
          />
          <span className={cn(step === "print" ? "text-primary font-medium" : "text-muted-foreground")}>
            {step === "qr" ? "QR добавлен" : step === "print" ? "Печать…" : "Предпросмотр"}
          </span>
        </div>
      </div>
    </ProductWindow>
  );
}
