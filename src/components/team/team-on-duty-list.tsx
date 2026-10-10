"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ellipsis, Users } from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { EmployeeProfileSheet } from "@/components/employees/employee-profile-sheet";
import { useAuth } from "@/components/providers/auth-provider";
import { StatusIndicator } from "@/components/indicator";
import { Button } from "@/components/ui/button";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
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
import { formatRole, userCopy } from "@/lib/user-copy";
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
  const { profile, firebaseUser } = useAuth();
  const accountInfo = firebaseUser ? getAccountProviderInfo(firebaseUser) : null;
  const selfPhotoURL = profile?.photoURL ?? accountInfo?.photoURL ?? null;
  const selfUid = profile?.id ?? firebaseUser?.uid ?? "";
  const now = Date.now();
  const [profileEmployee, setProfileEmployee] = useState<CompanyEmployee | null>(null);

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

  // Keep sheet employee in sync with live list updates.
  const activeProfileEmployee = profileEmployee
    ? (employees.find(
        (employee) =>
          employee.id === profileEmployee.id || employee.uid === profileEmployee.uid,
      ) ?? profileEmployee)
    : null;

  if (teammates.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={userCopy.team.onDutyEmptyTitle}
        description={userCopy.team.onDutyEmptyDescription}
        className="m-4 border-none bg-transparent py-8"
      />
    );
  }

  return (
    <>
      <ul className={cn("flex flex-col divide-y divide-border/70", className)}>
        {teammates.map((employee) => {
          const online = isOnline(employee, now);
          const openCount = assignmentCounts?.get(employee.id);
          const workloadLabel =
            typeof openCount === "number"
              ? userCopy.team.openWorkOrders(openCount)
              : formatRole(employee.role);

          return (
            <li
              className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
              key={employee.id}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => setProfileEmployee(employee)}
              >
                <UserAvatar
                  photoURL={
                    employee.uid === selfUid || employee.id === selfUid
                      ? selfPhotoURL ?? employee.photoURL
                      : employee.photoURL
                  }
                  displayName={employee.fullName}
                  email={employee.email}
                  seed={employee.uid || employee.id}
                  provider={
                    employee.uid === selfUid || employee.id === selfUid
                      ? accountInfo?.kind
                      : undefined
                  }
                  showProviderBadge={employee.uid === selfUid || employee.id === selfUid}
                  size="md"
                  className="shadow-sm"
                />
                <div className="min-w-0 flex-1 pr-1">
                  <p className="truncate text-sm font-medium leading-snug">{employee.fullName}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] leading-snug text-muted-foreground">
                    <span className="flex shrink-0 items-center gap-1">
                      <StatusIndicator color={online ? "emerald" : "amber"} pulse={online} />
                      {online ? userCopy.team.online : userCopy.team.offline}
                    </span>
                    <span className="inline-flex size-1 rounded-full bg-foreground/50" />
                    <span className="truncate tabular-nums">{workloadLabel}</span>
                  </p>
                </div>
              </button>
              {showActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        aria-label={userCopy.team.actionsFor(employee.fullName)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  >
                    <Ellipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
                        {employee.fullName}
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setProfileEmployee(employee)}>
                        {userCopy.team.employeeProfile}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/work-orders" />}>
                        {userCopy.team.workOrdersLink}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          );
        })}
      </ul>

      <EmployeeProfileSheet
        employee={activeProfileEmployee}
        open={activeProfileEmployee != null}
        onOpenChange={(open) => {
          if (!open) setProfileEmployee(null);
        }}
        assignmentCount={
          activeProfileEmployee
            ? assignmentCounts?.get(activeProfileEmployee.id)
            : undefined
        }
      />
    </>
  );
}
