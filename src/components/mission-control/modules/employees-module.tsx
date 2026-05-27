"use client";

import { memo, useMemo } from "react";
import { Users } from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { CompanyEmployee } from "@/domain/rbac";
import { ActiveEmployeesStrip } from "@/components/mission-control/presence/active-employees-strip";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";
import { Badge } from "@/components/ui/badge";
import { formatRole } from "@/lib/user-copy";
import { resolveActivityLabel } from "@/lib/mission-control/activity-labels";

type EmployeesModuleProps = {
  employees: CompanyEmployee[];
  activityLogs: ActivityLogEntry[];
  isLoading: boolean;
};

export const EmployeesModule = memo(function EmployeesModule({
  employees,
  activityLogs,
  isLoading,
}: EmployeesModuleProps) {
  const recentActions = useMemo(() => {
    const seen = new Set<string>();
    const result: ActivityLogEntry[] = [];
    for (const entry of activityLogs) {
      if (entry.module === "employees" || entry.action.startsWith("employee.")) {
        if (!seen.has(entry.actor)) {
          seen.add(entry.actor);
          result.push(entry);
        }
      }
      if (result.length >= 4) break;
    }
    return result;
  }, [activityLogs]);

  const permissionAlerts = useMemo(
    () =>
      activityLogs.filter(
        (entry) =>
          entry.action.includes("permissions") ||
          entry.action.includes("role_changed") ||
          entry.severity === "warning" ||
          entry.severity === "critical",
      ).slice(0, 3),
    [activityLogs],
  );

  return (
    <article className="mc-module-card">
      <McModuleHeader
        icon={Users}
        title="Команда"
        description="Кто онлайн и что менял"
        href="/settings?section=employees"
        accent="violet"
      />
      <div className="mc-module-body space-y-4">
        <ActiveEmployeesStrip employees={employees} isLoading={isLoading} />

        <div className="space-y-2">
          <p className="mc-section-label">Недавние действия</p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Действий команды пока нет</p>
          ) : (
            recentActions.map((entry) => {
              const label = resolveActivityLabel(entry.action);
              return (
                <div key={entry.id} className="mc-list-row text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.actorName ?? "Сотрудник"}</span>
                    {entry.actorRole ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {formatRole(entry.actorRole)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{label.label}</p>
                </div>
              );
            })
          )}
        </div>

        {permissionAlerts.length > 0 ? (
          <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/8 to-transparent p-3">
            <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">Изменения прав</p>
            <div className="space-y-1">
              {permissionAlerts.map((entry) => (
                <p key={entry.id} className="text-xs text-muted-foreground">
                  {entry.actorName ?? entry.actor}: {resolveActivityLabel(entry.action).label}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
});
