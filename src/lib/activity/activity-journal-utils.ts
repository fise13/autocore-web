import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";

import { ActivityLogEntry } from "@/domain/rbac";
import { ActivityModule, ActivitySeverity } from "@/domain/activity-log";
import { moduleLabel, resolveActivityLabel } from "@/lib/mission-control/activity-labels";
import { formatWorkOrderActivityName } from "@/lib/work-order/work-order-display";

export type ActivityJournalModuleFilter = ActivityModule | "all";
export type ActivityJournalSeverityFilter = ActivitySeverity | "all";

export type ActivityJournalFilters = {
  search: string;
  module: ActivityJournalModuleFilter;
  severity: ActivityJournalSeverityFilter;
};

export type ActivityDayGroup = {
  key: string;
  label: string;
  entries: ActivityLogEntry[];
};

export function actorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function formatActivityTargetName(entry: ActivityLogEntry, module: ActivityModule): string | null {
  const raw = entry.targetName?.trim();
  if (!raw) return null;
  if (module === "work_orders" && /^\d+$/.test(raw)) {
    return formatWorkOrderActivityName({ number: raw, id: entry.targetId ?? "" });
  }
  return raw;
}

export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Сегодня";
  if (isYesterday(date)) return "Вчера";
  return format(date, "d MMMM yyyy", { locale: ru });
}

export function filterActivityEntries(
  entries: ActivityLogEntry[],
  filters: ActivityJournalFilters,
): ActivityLogEntry[] {
  const query = filters.search.trim().toLowerCase();

  return entries.filter((entry) => {
    const resolved = resolveActivityLabel(entry.action);
    const module = entry.module ?? resolved.module;
    const severity = entry.severity ?? resolved.severity;
    const actorName = entry.actorName?.trim() || "Сотрудник";
    const targetName = formatActivityTargetName(entry, module);

    if (filters.module !== "all" && module !== filters.module) return false;
    if (filters.severity !== "all" && severity !== filters.severity) return false;

    if (!query) return true;

    const haystack = [
      actorName,
      resolved.label,
      targetName,
      moduleLabel(module),
      entry.action,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function groupActivityEntriesByDay(entries: ActivityLogEntry[]): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();

  for (const entry of entries) {
    const timestamp = entry.timestamp ?? new Date(0);
    const key = entry.timestamp ? format(timestamp, "yyyy-MM-dd") : "unknown";
    const label = entry.timestamp ? formatDayLabel(timestamp) : "Без даты";

    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }

    groups.set(key, { key, label, entries: [entry] });
  }

  return [...groups.values()];
}

export const MODULE_FILTER_OPTIONS: { value: ActivityJournalModuleFilter; label: string }[] = [
  { value: "all", label: "Все модули" },
  { value: "inventory", label: moduleLabel("inventory") },
  { value: "accounting", label: moduleLabel("accounting") },
  { value: "work_orders", label: moduleLabel("work_orders") },
  { value: "employees", label: moduleLabel("employees") },
  { value: "settings", label: moduleLabel("settings") },
  { value: "system", label: moduleLabel("system") },
];

export const SEVERITY_FILTER_OPTIONS: { value: ActivityJournalSeverityFilter; label: string }[] = [
  { value: "all", label: "Любая важность" },
  { value: "info", label: "Обычные" },
  { value: "warning", label: "Предупреждения" },
  { value: "critical", label: "Критичные" },
];
