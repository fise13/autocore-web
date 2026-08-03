"use client";

import { memo, useMemo } from "react";
import { Users } from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { CompanyEmployee } from "@/domain/rbac";
import { ActiveEmployeesStrip } from "@/components/overview/presence/active-employees-strip";
import { McModuleHeader } from "@/components/overview/mc-module-header";
import { resolveActivityLabel } from "@/lib/overview/activity-labels";
import { userCopy } from "@/lib/user-copy";

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
  const copy = userCopy.overview.modules.employees;
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
      if (result.length >= 3) break;
    }
    return result;
  }, [activityLogs]);

  return (
    <article className="mc-module-card">
      <McModuleHeader icon={Users} title={copy.title} href="/settings?section=company" accent="violet" />
      <div className="mc-module-body space-y-3">
        <ActiveEmployeesStrip employees={employees} isLoading={isLoading} />

        <div className="space-y-1.5">
          <p className="mc-section-label">{copy.actions}</p>
          {isLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            recentActions.map((entry) => {
              const label = resolveActivityLabel(entry.action);
              return (
                <div key={entry.id} className="mc-list-row py-2 text-sm">
                  <p className="truncate font-medium">{entry.actorName ?? userCopy.activity.actorFallback}</p>
                  <p className="truncate text-xs text-muted-foreground">{label.label}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </article>
  );
});
