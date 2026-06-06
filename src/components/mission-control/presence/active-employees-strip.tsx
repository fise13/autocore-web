"use client";

import { memo } from "react";

import { CompanyEmployee } from "@/domain/rbac";
import { isEmployeeOnline } from "@/lib/mission-control/compute-overview-metrics";
import { formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type ActiveEmployeesStripProps = {
  employees: CompanyEmployee[];
  isLoading: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export const ActiveEmployeesStrip = memo(function ActiveEmployeesStrip({
  employees,
  isLoading,
}: ActiveEmployeesStripProps) {
  const active = employees.filter((employee) => employee.isActive);
  const online = active.filter(isEmployeeOnline);

  if (isLoading) {
    return <div className="h-14 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{online.length}</span> онлайн
        <span className="mx-1 text-border">/</span>
        <span className="font-semibold text-foreground">{active.length}</span> активных
      </p>
      <div className="flex flex-wrap gap-1.5">
        {active.slice(0, 6).map((employee) => {
          const onlineNow = isEmployeeOnline(employee);
          return (
            <div
              key={employee.uid}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors",
                onlineNow
                  ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : "border-border/50 bg-background/40",
              )}
            >
              <span className="relative flex size-6 items-center justify-center rounded-full border border-border/40 bg-muted/50 text-[9px] font-semibold">
                {initials(employee.fullName || employee.email)}
                {onlineNow ? (
                  <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                ) : null}
              </span>
              <span className="max-w-[72px] truncate font-medium">{employee.fullName || employee.email}</span>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">{formatRole(employee.role)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
