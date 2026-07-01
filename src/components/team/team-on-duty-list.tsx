"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EllipsisIcon, UsersIcon } from "lucide-react";

import { GradientAvatarFallback } from "@/components/account/gradient-avatar-fallback";
import { StatusIndicator } from "@/components/indicator";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyEmployee } from "@/domain/rbac";
import { formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

function isOnline(employee: CompanyEmployee, now: number) {
  const lastActive = employee.lastActiveAt?.getTime() ?? 0;
  return employee.isActive && lastActive > 0 && now - lastActive <= ONLINE_WINDOW_MS;
}

export type TeamOnDutyListProps = {
  employees: CompanyEmployee[];
  assignmentCounts?: Map<string, number>;
  limit?: number;
  showActions?: boolean;
  className?: string;
};

export function TeamOnDutyList({
  employees,
  assignmentCounts,
  limit,
  showActions = true,
  className,
}: TeamOnDutyListProps) {
  const now = Date.now();

  const teammates = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.isActive)
      .sort((a, b) => {
        const aOnline = isOnline(a, now);
        const bOnline = isOnline(b, now);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        const aCount = assignmentCounts?.get(a.id) ?? 0;
        const bCount = assignmentCounts?.get(b.id) ?? 0;
        if (aCount !== bCount) return bCount - aCount;
        return a.fullName.localeCompare(b.fullName, "ru");
      })
      .slice(0, limit ?? employees.length);
  }, [assignmentCounts, employees, limit, now]);

  if (teammates.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Никого на смене"
        description="Когда сотрудники войдут в систему, они появятся здесь."
        className="m-4 border-none bg-transparent py-8"
      />
    );
  }

  return (
    <ul className={cn("flex flex-col divide-y divide-border/70", className)}>
      {teammates.map((employee) => {
        const online = isOnline(employee, now);
        const openCount = assignmentCounts?.get(employee.id);
        const workloadLabel =
          typeof openCount === "number"
            ? `${openCount} ${openCount === 1 ? "заказ-наряд" : openCount < 5 ? "заказ-наряда" : "заказ-нарядов"}`
            : formatRole(employee.role);

        return (
          <li
            className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
            key={employee.id}
          >
            <Avatar className="size-9 shadow-sm ring-1 ring-border/30">
              <GradientAvatarFallback seed={employee.uid || employee.id} />
            </Avatar>
            <div className="min-w-0 flex-1 pr-1">
              <p className="truncate text-sm font-medium leading-snug">{employee.fullName}</p>
              <p className="mt-0.5 flex items-center gap-2 text-[11px] leading-snug text-muted-foreground">
                <span className="flex shrink-0 items-center gap-1">
                  <StatusIndicator color={online ? "emerald" : "amber"} pulse={online} />
                  {online ? "Онлайн" : "Не в сети"}
                </span>
                <span className="inline-flex size-1 rounded-full bg-foreground/50" />
                <span className="truncate tabular-nums">{workloadLabel}</span>
              </p>
            </div>
            {showActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label={`Действия для ${employee.fullName}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                      size="icon-xs"
                      variant="ghost"
                    />
                  }
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
                    {employee.fullName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => {
                        window.location.href = `/team?tab=employees&member=${employee.id}`;
                      }}
                    >
                      Профиль сотрудника
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/work-orders" />}>
                      Заказ-наряды
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
