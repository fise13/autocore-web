"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { ConfidenceBadge } from "@/components/warehouse/import/shared/confidence-badge";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import { cn } from "@/lib/utils";

const STEPS = ["idle", "drop", "map", "import", "done"] as const;
type Step = (typeof STEPS)[number];

/** AI import walkthrough using real warehouse import UI pieces. Starts only on click. */
export function ProductAiImportSurface({ className }: { className?: string }) {
  const chrome = useDemoChrome();
  const [step, setStep] = useState<Step>("idle");
  const running = step !== "idle" && step !== "done";

  useEffect(() => {
    if (step === "idle" || step === "done") return;

    const next: Record<Exclude<Step, "idle" | "done">, Step> = {
      drop: "map",
      map: "import",
      import: "done",
    };

    const id = window.setTimeout(() => {
      setStep(next[step as Exclude<Step, "idle" | "done">]);
    }, 1600);

    return () => window.clearTimeout(id);
  }, [step]);

  const progress =
    step === "idle" || step === "drop"
      ? 0
      : step === "map"
        ? 35
        : step === "import"
          ? 72
          : 100;

  const start = () => setStep("drop");
  const reset = () => setStep("idle");

  return (
    <ProductWindow title={chrome.aiImport.windowTitle} className={cn("product-ai-real", className)}>
      <div className="space-y-4">
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border border-dashed p-5 transition-colors",
            step === "drop" || step === "idle"
              ? "border-primary bg-primary/5"
              : "border-border",
          )}
        >
          {step === "done" ? (
            <FileSpreadsheet className="size-8 text-emerald-500" aria-hidden />
          ) : (
            <Upload className="size-8 text-muted-foreground" aria-hidden />
          )}
          <p className="mt-2 text-xs font-medium">
            {step === "done"
              ? chrome.aiImport.accepted
              : step === "map"
                ? chrome.aiImport.mapping
                : step === "import"
                  ? chrome.aiImport.importing
                  : step === "drop"
                    ? chrome.aiImport.dropFile
                    : chrome.aiImport.ready}
          </p>

          {step === "idle" ? (
            <button
              type="button"
              className="product-ai-start-btn mt-3"
              onClick={start}
            >
              {chrome.aiImport.upload}
            </button>
          ) : null}

          {step === "done" ? (
            <button
              type="button"
              className="product-ai-start-btn is-ghost mt-3"
              onClick={reset}
            >
              {chrome.aiImport.runAgain}
            </button>
          ) : null}
        </div>

        {step !== "idle" ? <ImportProgressBar percent={progress} /> : null}

        {step !== "idle" && step !== "drop" ? (
          <div className="space-y-1.5">
            {chrome.aiImport.mappingRows.map((row, index) => (
              <div
                key={row.col}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-xs transition-opacity",
                  step === "map" && index === 1 ? "border-primary bg-primary/5" : "border-border",
                  running && step === "map" && index > 1 ? "opacity-50" : undefined,
                )}
              >
                <span className="text-muted-foreground">{row.col}</span>
                <span className="exp-mock-mono text-primary">→ {row.field}</span>
                <ConfidenceBadge confidence={row.confidence} />
              </div>
            ))}
          </div>
        ) : null}

        {step === "done" ? (
          <p className="text-center text-[11px] text-emerald-600 dark:text-emerald-400">
            {chrome.aiImport.done}
          </p>
        ) : null}
      </div>
    </ProductWindow>
  );
}
