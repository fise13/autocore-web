"use client";

import { Barcode, MapPin } from "lucide-react";

import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import type { PlatformSyncStep } from "@/components/marketing/experience/motion/platform-sync-steps";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INTERNAL_STEPS = ["card", "scan", "reserve"] as const;

type InventoryMockProps = {
  className?: string;
  paused?: boolean;
  variant?: "window" | "plain";
  /** When set with `controlled`, drives phone UI from platform sync timeline. */
  phase?: PlatformSyncStep;
  controlled?: boolean;
};

function phaseToUi(phase: PlatformSyncStep) {
  switch (phase) {
    case "idle":
      return { vin: "—", scanActive: false, status: "Сканирование VIN", saving: false };
    case "scan":
      return { vin: "—", scanActive: true, status: "Сканируем код…", saving: false };
    case "detect":
      return { vin: "KMHGC…", scanActive: true, status: "VIN распознан", saving: false };
    case "save":
      return { vin: "KMHGC…", scanActive: false, status: "Сохранено на телефоне", saving: true };
    case "sync":
    case "live":
      return { vin: "KMHGC…", scanActive: false, status: "Зарезервировано под НЗ-0142", saving: false };
  }
}

export function InventoryMock({
  className,
  paused,
  variant = "window",
  phase,
  controlled,
}: InventoryMockProps) {
  const { step: internalStep } = useLiveSequence(INTERNAL_STEPS, {
    intervalMs: 2600,
    paused: paused || controlled,
  });

  const ui = controlled && phase ? phaseToUi(phase) : internalPhaseToUi(internalStep);

  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">G4KC · 2.4L</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">SN: KMHGC41DPEU123456</p>
        </div>
        <Badge variant="outline" className="font-normal">
          {ui.saving ? "Резерв" : "В наличии"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <InfoCell icon={MapPin} label="Полка" value="A-12" />
        <InfoCell icon={Barcode} label="VIN" value={ui.vin} highlight={ui.scanActive && ui.vin !== "—"} />
      </div>

      <div
        className={cn(
          "rounded-lg border border-dashed p-3 text-center transition-colors duration-300 min-h-[5.5rem] flex flex-col items-center justify-center",
          ui.scanActive ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20",
        )}
      >
        <Barcode
          className={cn("mx-auto size-5 text-muted-foreground", ui.scanActive && "text-primary")}
          aria-hidden
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{ui.status}</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Стоимость</span>
        <span className="font-mono font-medium tabular-nums">$4,200</span>
      </div>
    </div>
  );

  if (variant === "plain") {
    return (
      <McPanel className={cn("shadow-none dark:ring-0", className)}>
        <McPanelHeader
          title="Склад · Телефон"
          description="Кладовщик"
          bordered
          badge={
            controlled && phase ? (
              <Badge variant="outline" className="font-normal text-[10px]">
                {phase === "live" ? "Отправлено" : "В работе"}
              </Badge>
            ) : undefined
          }
        />
        <McPanelBody>{body}</McPanelBody>
      </McPanel>
    );
  }

  return (
    <ProductWindow title="Склад · Двигатели" live className={className}>
      {body}
    </ProductWindow>
  );
}

function internalPhaseToUi(step: (typeof INTERNAL_STEPS)[number]) {
  if (step === "scan") {
    return { vin: "KMHGC…", scanActive: true, status: "VIN отсканирован", saving: false };
  }
  if (step === "reserve") {
    return { vin: "KMHGC…", scanActive: false, status: "Зарезервировано под НЗ-0142", saving: false };
  }
  return { vin: "—", scanActive: false, status: "Сканирование VIN", saving: false };
}

function InfoCell({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20 p-2.5",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-1 font-mono text-xs font-medium tabular-nums">{value}</p>
    </div>
  );
}
