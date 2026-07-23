"use client";

import { FileText, Printer, QrCode } from "lucide-react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { cn } from "@/lib/utils";

const STEPS = ["preview", "print", "qr"] as const;

type DocumentsMockProps = {
  className?: string;
  paused?: boolean;
};

export function DocumentsMock({ className, paused }: DocumentsMockProps) {
  const chrome = useDemoChrome();
  const { step } = useLiveSequence(STEPS, { intervalMs: 2800, paused });

  return (
    <ProductWindow title={chrome.documents.title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{chrome.documents.warrantyTicket}</p>
            <p className="exp-mock-mono text-[10px] text-muted-foreground">{chrome.documents.orderDays}</p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border bg-card p-3 transition-all",
            step === "preview" ? "border-primary/40 shadow-sm" : "border-border",
          )}
        >
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <p>{chrome.documents.engineLine}</p>
            <p>{chrome.documents.vehicleLine}</p>
            <p>{chrome.documents.mileageLine}</p>
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
            {step === "qr"
              ? chrome.documents.qrAdded
              : step === "print"
                ? chrome.documents.printing
                : chrome.documents.preview}
          </span>
        </div>
      </div>
    </ProductWindow>
  );
}
