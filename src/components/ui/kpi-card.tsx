"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type KpiCardTone = "default" | "primary" | "warning" | "destructive";

type KpiCardProps = {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: KpiCardTone;
  variant?: "default" | "dashboard";
  className?: string;
  footer?: ReactNode;
};

const valueToneClass: Record<KpiCardTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
};

const iconToneClass: Record<KpiCardTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
};

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function KpiCard({
  label,
  value,
  suffix = "",
  hint,
  icon: Icon,
  tone = "default",
  variant = "default",
  className,
  footer,
}: KpiCardProps) {
  const isDashboard = variant === "dashboard";

  return (
    <div
      data-slot="kpi-card"
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl",
        isDashboard ? "mc-stat-card mc-kpi-shell" : "border bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="mc-section-label text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconToneClass[tone],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", valueToneClass[tone])}>
        {formatValue(value)}
        {suffix ? <span className="text-lg font-medium">{suffix}</span> : null}
      </p>

      {hint || footer ? (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs">
          {footer}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
