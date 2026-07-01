"use client";

import { memo, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { SearchIcon } from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { ActivitySeverity } from "@/domain/activity-log";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GradientAvatarFallback } from "@/components/account/gradient-avatar-fallback";
import { Avatar, AvatarBadge } from "@/components/ui/avatar";
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
  filterActivityEntries,
  formatActivityTargetName,
  groupActivityEntriesByDay,
  MODULE_FILTER_OPTIONS,
  SEVERITY_FILTER_OPTIONS,
  type ActivityJournalFilters,
} from "@/lib/activity/activity-journal-utils";
import { moduleLabel, resolveActivityLabel } from "@/lib/mission-control/activity-labels";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[min(100%,14rem)] flex-1">
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Поиск по автору, действию, объекту…"
            aria-label="Поиск в журнале"
          />
        </InputGroup>

        <Select
          value={filters.module}
          onValueChange={(value) =>
            onChange({ ...filters, module: value as ActivityJournalFilters["module"] })
          }
        >
          <SelectTrigger size="sm" className="w-[9.5rem]">
            <SelectValue />
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
          <SelectTrigger size="sm" className="w-[10.5rem]">
            <SelectValue />
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
          {filteredCount === totalCount
            ? `${totalCount} событий`
            : `${filteredCount} из ${totalCount} событий`}
        </span>
        {filters.search || filters.module !== "all" || filters.severity !== "all" ? (
          <button
            type="button"
            className="font-medium text-primary transition-opacity hover:opacity-80"
            onClick={() =>
              onChange({ search: "", module: "all", severity: "all" })
            }
          >
            Сбросить фильтры
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
  const actorName = entry.actorName?.trim() || "Сотрудник";
  const module = entry.module ?? resolved.module;
  const severity = entry.severity ?? resolved.severity;
  const targetName = formatActivityTargetName(entry, module);
  const when = entry.timestamp
    ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ru })
    : "сейчас";

  return (
    <article
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4",
        highlight && "bg-primary/[0.03]",
      )}
    >
      <Avatar size="sm" className="row-span-2 sm:row-span-1">
        <GradientAvatarFallback seed={entry.actor || actorName} />
        <AvatarBadge className={severityBadgeClass[severity] ?? severityBadgeClass.info} />
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

      <Badge variant="outline" className="col-start-2 row-start-2 w-fit sm:col-start-3 sm:row-start-1">
        {moduleLabel(module)}
      </Badge>

      <time
        className="col-start-2 row-start-3 shrink-0 text-xs tabular-nums text-muted-foreground sm:col-start-4 sm:row-start-1 sm:text-right"
        dateTime={entry.timestamp?.toISOString()}
        title={entry.timestamp?.toLocaleString("ru-RU")}
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Полный журнал</CardTitle>
            <CardDescription className="mt-1">
              Детализация по модулям, авторам и объектам
            </CardDescription>
          </div>
          {!isLoading && !error ? (
            <Badge variant="secondary" className="shrink-0">
              {filteredEntries.length} записей
            </Badge>
          ) : null}
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
              <AlertTitle>Не удалось загрузить журнал</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : isLoading ? (
          <ActivityJournalSkeleton />
        ) : filteredEntries.length === 0 ? (
          <Empty className="m-4 min-h-[16rem] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>
                {entries.length === 0 ? "Пока нет записей" : "Ничего не найдено"}
              </EmptyTitle>
              <EmptyDescription>
                {entries.length === 0
                  ? "События появятся после действий в складе, бухгалтерии и заказ-нарядах."
                  : "Попробуйте изменить фильтры или поисковый запрос."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="sticky top-0 z-10 hidden border-b bg-muted/80 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4">
              <span className="w-6" aria-hidden />
              <span>Событие</span>
              <span className="w-[5.5rem]">Модуль</span>
              <span className="w-[5.5rem] text-right">Время</span>
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

                <div>
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
