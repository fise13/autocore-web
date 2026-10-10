"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ClipboardListIcon,
  FolderIcon,
  PackageIcon,
  SettingsIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveActivityLabel } from "@/lib/overview/activity-labels";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import { dateFnsLocale } from "@/lib/locale/date-locale";

const moduleIcons: Record<string, LucideIcon> = {
  inventory: PackageIcon,
  accounting: FolderIcon,
  employees: UsersRoundIcon,
  work_orders: ClipboardListIcon,
  settings: SettingsIcon,
  system: SettingsIcon,
};

export type WorkspaceActivityFeedProps = {
  entries: ActivityLogEntry[];
  limit?: number;
  className?: string;
};

export function WorkspaceActivityFeed({ entries, limit, className }: WorkspaceActivityFeedProps) {
  const items = entries.slice(0, limit ?? entries.length);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardListIcon}
        title={userCopy.activity.emptyTitle}
        description={userCopy.activity.emptyDescription}
        className="m-4 border-none bg-transparent py-8"
      />
    );
  }

  return (
    <ul className={cn("flex flex-col divide-y divide-border/70", className)}>
      {items.map((entry) => {
        const resolved = resolveActivityLabel(entry.action);
        const entryModule = entry.module ?? resolved.module;
        const Icon = moduleIcons[entryModule] ?? SettingsIcon;
        const when = entry.timestamp
          ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: dateFnsLocale() })
          : userCopy.activity.now;
        const actor = entry.actorName?.trim() || userCopy.activity.actorFallback;
        const title = `${actor}: ${resolved.label}${entry.targetName ? ` · ${entry.targetName}` : ""}`;

        return (
          <li
            className="flex min-h-[4.5rem] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/25"
            key={entry.id}
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm [&_svg]:size-4"
            >
              <Icon className="text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <p className="line-clamp-2 text-pretty text-xs leading-snug">{title}</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{when}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
