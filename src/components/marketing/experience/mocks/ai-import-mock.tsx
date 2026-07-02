"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { cn } from "@/lib/utils";

const STEPS = ["drop", "map", "done"] as const;

const MAPPING = [
  { col: "Артикул", field: "SKU" },
  { col: "Наименование", field: "Название" },
  { col: "Цена", field: "Стоимость" },
] as const;

type AiImportMockProps = {
  className?: string;
  paused?: boolean;
};

export function AiImportMock({ className, paused }: AiImportMockProps) {
  const { step } = useLiveSequence(STEPS, { intervalMs: 3000, paused });

  return (
    <ProductWindow title="Импорт · Прайс поставщика" className={className}>
      <div className="space-y-3">
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border border-dashed p-4 transition-colors",
            step === "drop" ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          {step === "done" ? (
            <FileSpreadsheet className="size-8 text-emerald-500" aria-hidden />
          ) : (
            <Upload className="size-8 text-muted-foreground" aria-hidden />
          )}
          <p className="mt-2 text-xs font-medium">
            {step === "done" ? "Принято 128 позиций" : step === "map" ? "Сопоставление колонок" : "Перетащите Excel"}
          </p>
        </div>

        {step !== "drop" ? (
          <div className="space-y-1.5">
            {MAPPING.map((row, i) => (
              <div
                key={row.col}
                className={cn(
                  "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-opacity",
                  step === "map" && i === 1 ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <span className="text-muted-foreground">{row.col}</span>
                <span className="exp-mock-mono text-primary">→ {row.field}</span>
              </div>
            ))}
          </div>
        ) : null}

        {step === "done" ? (
          <p className="text-center text-[10px] text-emerald-600">Импорт завершён · 128 позиций на складе</p>
        ) : null}
      </div>
    </ProductWindow>
  );
}
