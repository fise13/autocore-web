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
    return <div className="h-20 animate-pulse rounded-xl bg-muted/50" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{online.length}</span> онлайн
          <span className="mx-1.5 text-border">·</span>
          <span className="font-semibold text-foreground">{active.length}</span> активных
        </p>
        {online.length > 0 ? (
          <span className="mc-live-badge py-1 text-[10px]">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {online.length} в сети
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {active.slice(0, 8).map((employee) => {
          const onlineNow = isEmployeeOnline(employee);
          return (
            <div
              key={employee.uid}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                onlineNow
                  ? "border-emerald-500/25 bg-emerald-500/[0.06] shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)]"
                  : "border-border/50 bg-background/40",
              )}
            >
              <span className="relative flex size-7 items-center justify-center rounded-full border border-border/40 bg-gradient-to-br from-muted to-muted/30 text-[10px] font-semibold">
                {initials(employee.fullName || employee.email)}
                {onlineNow ? (
                  <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                ) : null}
              </span>
              <span className="max-w-[88px] truncate font-medium">{employee.fullName || employee.email}</span>
              <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {formatRole(employee.role)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
