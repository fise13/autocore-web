"use client";

import type { LucideIcon } from "lucide-react";

import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import { KpiCard } from "@/components/ui/kpi-card";
import { cn } from "@/lib/utils";

type McStatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "amber" | "destructive";
  className?: string;
};

const toneMap: Record<NonNullable<McStatCardProps["tone"]>, "default" | "primary" | "warning" | "destructive"> = {
  default: "default",
  primary: "primary",
  amber: "warning",
  destructive: "destructive",
};

export function McStatCard({
  label,
  value,
  suffix = "",
  hint,
  delta,
  icon,
  tone = "default",
  className,
}: McStatCardProps) {
  return (
    <KpiCard
      label={label}
      value={value}
      suffix={suffix}
      hint={hint}
      icon={icon}
      tone={toneMap[tone]}
      variant="dashboard"
      className={cn(className)}
      footer={
        delta != null ? (
          <Delta value={delta}>
            <DeltaIcon variant="trend" />
            <DeltaValue />
          </Delta>
        ) : null
      }
    />
  );
}
