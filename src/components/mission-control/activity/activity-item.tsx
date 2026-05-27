"use client";

import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import { ActivityLogEntry } from "@/domain/rbac";
import { resolveActivityLabel, moduleLabel } from "@/lib/mission-control/activity-labels";
import { formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type ActivityItemProps = {
  entry: ActivityLogEntry;
  isNew?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const severityDot: Record<string, string> = {
  info: "bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_50%,transparent)]",
  warning: "bg-amber-500 shadow-[0_0_6px_color-mix(in_oklab,var(--chart-4)_50%,transparent)]",
  critical: "bg-red-500 shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_50%,transparent)]",
};

const moduleChip: Record<string, string> = {
  inventory: "border-chart-2/25 bg-chart-2/8 text-chart-2",
  accounting: "border-chart-1/25 bg-chart-1/8 text-chart-1",
  employees: "border-chart-5/25 bg-chart-5/8 text-chart-5",
  settings: "border-chart-4/25 bg-chart-4/8 text-chart-4",
  system: "border-border/50 bg-muted/40 text-muted-foreground",
};

export const ActivityItem = memo(function ActivityItem({ entry, isNew }: ActivityItemProps) {
  const resolved = resolveActivityLabel(entry.action);
  const actorName = entry.actorName?.trim() || "Сотрудник";
  const roleLabel = entry.actorRole ? formatRole(entry.actorRole) : null;
  const module = entry.module ?? resolved.module;
  const severity = entry.severity ?? resolved.severity;
  const when = entry.timestamp
    ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ru })
    : "только что";

  return (
    <article
      className={cn(
        "relative rounded-xl border border-border/50 bg-background/50 p-3 transition-all duration-300",
        isNew && "border-primary/25 bg-primary/[0.03] shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
      )}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-muted to-muted/40 text-xs font-semibold">
            {initials(actorName)}
          </div>
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-background",
              severityDot[severity] ?? severityDot.info,
            )}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm leading-snug">
            <span className="font-medium">{actorName}</span>
            {roleLabel ? <span className="text-muted-foreground"> · {roleLabel}</span> : null}{" "}
            <span className="text-foreground/90">{resolved.label}</span>
            {entry.targetName ? (
              <span className="text-muted-foreground"> · {entry.targetName}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                moduleChip[module] ?? moduleChip.system,
              )}
            >
              {moduleLabel(module)}
            </span>
            <time className="text-[11px] text-muted-foreground" dateTime={entry.timestamp?.toISOString()}>
              {when}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
});
