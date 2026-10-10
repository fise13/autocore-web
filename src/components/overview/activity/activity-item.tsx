"use client";

import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";

import { ActivityLogEntry } from "@/domain/rbac";
import { resolveActivityLabel, moduleLabel } from "@/lib/overview/activity-labels";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { formatWorkOrderActivityName } from "@/lib/work-order/work-order-display";
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
  info: "bg-primary",
  warning: "bg-warning",
  critical: "bg-danger",
};

const moduleChip: Record<string, string> = {
  inventory: "border-chart-2/25 bg-chart-2/8 text-chart-2",
  accounting: "border-chart-1/25 bg-chart-1/8 text-chart-1",
  employees: "border-chart-5/25 bg-chart-5/8 text-chart-5",
  work_orders: "border-primary/25 bg-primary/8 text-primary",
  settings: "border-chart-4/25 bg-chart-4/8 text-chart-4",
  system: "border-border/50 bg-muted/40 text-muted-foreground",
};

function formatActivityTargetName(entry: ActivityLogEntry, module: ActivityLogEntry["module"]): string | null {
  const raw = entry.targetName?.trim();
  if (!raw) return null;
  if (module === "work_orders" && /^\d+$/.test(raw)) {
    return formatWorkOrderActivityName({ number: raw, id: entry.targetId ?? "" });
  }
  return raw;
}

export const ActivityItem = memo(function ActivityItem({ entry, isNew }: ActivityItemProps) {
  const resolved = resolveActivityLabel(entry.action);
  const actorName = entry.actorName?.trim() || userCopy.activity.actorFallback;
  const entryModule = entry.module ?? resolved.module;
  const severity = entry.severity ?? resolved.severity;
  const dateLocale = getActiveUserCopyLocale() === "ru" ? ru : enUS;
  const when = entry.timestamp
    ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: dateLocale })
    : userCopy.activity.now;
  const targetName = formatActivityTargetName(entry, entryModule);

  return (
    <article
      className={cn(
        "relative rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 transition-colors duration-200",
        isNew && "border-primary/20 bg-primary/[0.03]",
      )}
    >
      <div className="flex gap-2.5">
        <div className="relative shrink-0">
          <div className="flex size-7 items-center justify-center rounded-full border border-border/50 bg-muted/50 text-micro font-semibold">
            {initials(actorName)}
          </div>
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full ring-2 ring-background",
              severityDot[severity] ?? severityDot.info,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug">
            <span className="font-medium">{actorName}</span>
            <span className="text-muted-foreground"> · {resolved.label}</span>
            {targetName ? <span className="text-muted-foreground"> · {targetName}</span> : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-micro font-medium",
                moduleChip[entryModule] ?? moduleChip.system,
              )}
            >
              {moduleLabel(entryModule)}
            </span>
            <time className="text-micro text-muted-foreground" dateTime={entry.timestamp?.toISOString()}>
              {when}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
});
