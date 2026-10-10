"use client";

import { memo } from "react";

import { UserAvatar } from "@/components/account/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { CompanyEmployee } from "@/domain/rbac";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { isEmployeeOnline } from "@/lib/overview/compute-overview-metrics";
import { formatRole, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type ActiveEmployeesStripProps = {
  employees: CompanyEmployee[];
  isLoading: boolean;
};

export const ActiveEmployeesStrip = memo(function ActiveEmployeesStrip({
  employees,
  isLoading,
}: ActiveEmployeesStripProps) {
  const { profile, firebaseUser } = useAuth();
  const accountInfo = firebaseUser ? getAccountProviderInfo(firebaseUser) : null;
  const selfPhotoURL = profile?.photoURL ?? accountInfo?.photoURL ?? null;
  const selfUid = profile?.id ?? firebaseUser?.uid ?? "";
  const active = employees.filter((employee) => employee.isActive);
  const online = active.filter(isEmployeeOnline);
  const presence = userCopy.overview.presence;

  if (isLoading) {
    return <div className="h-14 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{online.length}</span> {presence.online}
        <span className="mx-1 text-border">/</span>
        <span className="font-semibold text-foreground">{active.length}</span> {presence.active}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {active.slice(0, 6).map((employee) => {
          const onlineNow = isEmployeeOnline(employee);
          const isSelf = employee.uid === selfUid || employee.id === selfUid;
          return (
            <div
              key={employee.uid}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors",
                onlineNow
                  ? "border-success-border bg-success-subtle"
                  : "border-border/50 bg-background/40",
              )}
            >
              <span className="relative shrink-0">
                <UserAvatar
                  photoURL={isSelf ? selfPhotoURL ?? employee.photoURL : employee.photoURL}
                  displayName={employee.fullName}
                  email={employee.email}
                  seed={employee.uid || employee.id}
                  size="xs"
                />
                {onlineNow ? (
                  <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-success ring-2 ring-background" />
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
