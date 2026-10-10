"use client";

import { memo, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ClipboardList,
  Folder,
  Package,
  Search,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { ActivitySeverity } from "@/domain/activity-log";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GradientAvatarFallback } from "@/components/account/gradient-avatar-fallback";
import { Avatar, AvatarBadge, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  actorInitials,
  filterActivityEntries,
  formatActivityTargetName,
  formatEventCountLabel,
  groupActivityEntriesByDay,
  MODULE_FILTER_OPTIONS,
  moduleFilterLabel,
  SEVERITY_FILTER_OPTIONS,
  severityFilterLabel,
  type ActivityJournalFilters,
} from "@/lib/activity/activity-journal-utils";
import { moduleLabel, resolveActivityLabel } from "@/lib/overview/activity-labels";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import { dateFnsLocale } from "@/lib/locale/date-locale";

type ActivityLogJournalProps = {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
  className?: string;
};

const severityBadgeClass: Record<ActivitySeverity, string> = {
  info: "bg-primary",
  warning: "bg-chart-4",
  critical: "bg-destructive",
};

const moduleIcons: Record<string, LucideIcon> = {
  inventory: Package,
  accounting: Folder,
  employees: UsersRound,
  work_orders: ClipboardList,
  settings: Settings,
  system: Settings,
};

function ActivityJournalFiltersBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: {
  filters: ActivityJournalFilters;
  onChange: (next: ActivityJournalFilters) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const filtersActive =
    Boolean(filters.search.trim()) || filters.module !== "all" || filters.severity !== "all";

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[min(100%,14rem)] flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder={userCopy.activity.searchPlaceholder}
            aria-label={userCopy.activity.searchAria}
            className="h-8 border-border/50 bg-muted/20 pl-8 shadow-none"
          />
        </InputGroup>

        <Select
          value={filters.module}
          onValueChange={(value) =>
            onChange({ ...filters, module: value as ActivityJournalFilters["module"] })
          }
        >
          <SelectTrigger className="w-44 shrink-0" aria-label={userCopy.activity.moduleFilterAria}>
            <SelectValue>{moduleFilterLabel(filters.module)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {MODULE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(value) =>
            onChange({ ...filters, severity: value as ActivityJournalFilters["severity"] })
          }
        >
          <SelectTrigger className="w-44 shrink-0" aria-label={userCopy.activity.levelFilterAria}>
            <SelectValue>{severityFilterLabel(filters.severity)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {SEVERITY_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {filtersActive
            ? userCopy.activity.shownOf(filteredCount, totalCount)
            : formatEventCountLabel(totalCount)}
        </span>
        {filtersActive ? (
          <button
            type="button"
            className="font-medium text-primary transition-opacity hover:opacity-80"
            onClick={() => onChange({ search: "", module: "all", severity: "all" })}
          >
            {userCopy.activity.reset}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const ActivityJournalRow = memo(function ActivityJournalRow({
  entry,
  highlight,
}: {
  entry: ActivityLogEntry;
  highlight?: boolean;
}) {
  const resolved = resolveActivityLabel(entry.action);
  const actorName = entry.actorName?.trim() || userCopy.activity.actorFallback;
  const entryModule = entry.module ?? resolved.module;
  const severity = entry.severity ?? resolved.severity;
  const targetName = formatActivityTargetName(entry, entryModule);
  const when = entry.timestamp
    ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: dateFnsLocale() })
    : userCopy.activity.now;
  const ModuleIcon = moduleIcons[entryModule] ?? Settings;

  return (
    <article
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-4",
        highlight && "bg-primary/[0.04]",
      )}
    >
      <Avatar size="default" className="row-span-2 sm:row-span-1">
        {entry.actorPhotoURL ? <AvatarImage alt={actorName} src={entry.actorPhotoURL} /> : null}
        <GradientAvatarFallback seed={entry.actor || actorName} className="text-[11px] font-semibold text-white/90">
          {actorInitials(actorName)}
        </GradientAvatarFallback>
        {severity !== "info" ? <AvatarBadge className={severityBadgeClass[severity]} /> : null}
      </Avatar>

      <div className="min-w-0">
        <p className="truncate text-sm leading-snug">
          <span className="font-medium text-foreground">{actorName}</span>
          <span className="text-muted-foreground"> · {resolved.label}</span>
        </p>
        {targetName ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{targetName}</p>
        ) : null}
      </div>

      <Badge
        variant="outline"
        className="col-start-2 row-start-2 w-fit gap-1 text-muted-foreground sm:col-start-3 sm:row-start-1"
      >
        <ModuleIcon className="size-3" aria-hidden />
        {moduleLabel(entryModule)}
      </Badge>

      <time
        className="col-start-2 row-start-3 shrink-0 text-xs tabular-nums text-muted-foreground sm:col-start-4 sm:row-start-1 sm:text-right"
        dateTime={entry.timestamp?.toISOString()}
        title={entry.timestamp?.toLocaleString("en-US")}
      >
        {when}
      </time>
    </article>
  );
});

function ActivityJournalSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-[min(100%,18rem)]" />
            <Skeleton className="h-3 w-[min(100%,10rem)]" />
          </div>
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
          <Skeleton className="hidden h-3 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function ActivityLogJournal({
  entries,
  isLoading,
  error,
  className,
}: ActivityLogJournalProps) {
  const [filters, setFilters] = useState<ActivityJournalFilters>({
    search: "",
    module: "all",
    severity: "all",
  });

  const filteredEntries = useMemo(
    () => filterActivityEntries(entries, filters),
    [entries, filters],
  );

  const dayGroups = useMemo(
    () => groupActivityEntriesByDay(filteredEntries),
    [filteredEntries],
  );

  const newestId = filteredEntries[0]?.id;

  return (
    <Card
      className={cn(
        "flex min-h-[min(72vh,720px)] flex-col gap-0 overflow-hidden shadow-none dark:ring-0",
        className,
      )}
    >
      <CardHeader className="shrink-0 border-b bg-muted/20">
        <div className="min-w-0">
          <CardTitle className="text-base">{userCopy.activity.journalTitle}</CardTitle>
          <CardDescription className="mt-1">
            {userCopy.activity.journalDescription}
          </CardDescription>
        </div>
        {!isLoading && !error ? (
          <ActivityJournalFiltersBar
            filters={filters}
            onChange={setFilters}
            totalCount={entries.length}
            filteredCount={filteredEntries.length}
          />
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>{userCopy.activity.loadError}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : isLoading ? (
          <ActivityJournalSkeleton />
        ) : filteredEntries.length === 0 ? (
          <Empty className="m-4 min-h-[16rem] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>
                {entries.length === 0 ? userCopy.activity.empty : userCopy.activity.nothingFound}
              </EmptyTitle>
              <EmptyDescription>
                {entries.length === 0
                  ? userCopy.activity.emptyHint
                  : userCopy.activity.nothingFoundHint}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="sticky top-0 z-10 hidden border-b bg-muted/80 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4">
              <span className="w-6" aria-hidden />
              <span>{userCopy.activity.colEvent}</span>
              <span className="w-[5.5rem]">{userCopy.activity.colModule}</span>
              <span className="w-[5.5rem] text-right">{userCopy.activity.colTime}</span>
            </div>

            {dayGroups.map((group, groupIndex) => (
              <section key={group.key} aria-label={group.label}>
                <div className="sticky top-0 z-[1] flex items-center gap-3 bg-background/95 px-4 py-2.5 backdrop-blur-sm sm:top-[2.125rem]">
                  <p className="text-xs font-semibold tracking-tight text-foreground">{group.label}</p>
                  <Separator className="min-w-0 flex-1" />
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {group.entries.length}
                  </span>
                </div>

                <div className="divide-y divide-border/50">
                  {group.entries.map((entry) => (
                    <ActivityJournalRow
                      key={entry.id}
                      entry={entry}
                      highlight={entry.id === newestId && groupIndex === 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
