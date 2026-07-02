"use client";

import { Barcode, MapPin } from "lucide-react";

import type { PlatformSyncStep } from "@/components/marketing/experience/motion/platform-sync-steps";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PhoneInventoryScreenProps = {
  step: PlatformSyncStep;
  className?: string;
};

function stepToUi(step: PlatformSyncStep) {
  switch (step) {
    case "idle":
      return { vin: "—", scanActive: false, status: "Сканирование VIN", saving: false };
    case "scan":
      return { vin: "—", scanActive: true, status: "Сканируем код…", saving: false };
    case "detect":
      return { vin: "KMHGC…", scanActive: true, status: "VIN распознан", saving: false };
    case "save":
      return { vin: "KMHGC…", scanActive: false, status: "Сохранено", saving: true };
    case "sync":
    case "live":
      return { vin: "KMHGC…", scanActive: false, status: "Отправлено на desktop", saving: false };
  }
}

export function PhoneInventoryScreen({ step, className }: PhoneInventoryScreenProps) {
  const ui = stepToUi(step);

  return (
    <div className={cn("device-phone-app", className)}>
      <div className="device-phone-app-header">
        <div>
          <p className="device-phone-app-title">Склад</p>
          <p className="device-phone-app-sub">Кладовщик</p>
        </div>
        <Badge variant="outline" className="h-5 border-border/80 px-1.5 text-[9px] font-normal">
          {step === "live" ? "Отправлено" : "В работе"}
        </Badge>
      </div>

      <div className="device-phone-app-body">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold leading-tight">G4KC · 2.4L</p>
            <p className="mt-0.5 font-mono text-[9px] text-muted-foreground tabular-nums">KMHGC41D…</p>
          </div>
          <Badge variant="outline" className="h-4 px-1 text-[8px] font-normal">
            {ui.saving ? "Резерв" : "В наличии"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <InfoCell icon={MapPin} label="Полка" value="A-12" />
          <InfoCell icon={Barcode} label="VIN" value={ui.vin} highlight={ui.scanActive && ui.vin !== "—"} />
        </div>

        <div
          className={cn(
            "flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border border-dashed p-2 text-center transition-colors duration-300",
            ui.scanActive ? "border-primary/40 bg-primary/5" : "border-border/80 bg-muted/25",
          )}
        >
          <Barcode
            className={cn("size-4 text-muted-foreground", ui.scanActive && "text-primary")}
            aria-hidden
          />
          <p className="mt-1 text-[9px] leading-snug text-muted-foreground">{ui.status}</p>
        </div>
      </div>
    </div>
  );
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
        "rounded-md border border-border/70 bg-muted/20 p-1.5",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <Icon className="size-2.5" aria-hidden />
        <span className="text-[8px]">{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-[9px] font-medium tabular-nums">{value}</p>
    </div>
  );
}
