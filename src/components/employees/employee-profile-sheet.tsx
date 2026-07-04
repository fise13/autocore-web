"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  Mail,
  Shield,
  UserRound,
  UserX,
} from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { StatusIndicator } from "@/components/indicator";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CompanyEmployee } from "@/domain/rbac";
import { ROLE_PERMISSIONS, USER_ROLES, UserRole } from "@/domain/user";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { canManageEmployees } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const employeeRepository = createEmployeeRbacRepository();
const ASSIGNABLE_ROLES = USER_ROLES.filter((role) => role !== "owner");
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

type EmployeeProfileSheetProps = {
  employee: CompanyEmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentCount?: number;
  onOpenPermissions?: (employee: CompanyEmployee) => void;
};

function ProfileRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0",
        className,
      )}
    >
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

export function EmployeeProfileSheet({
  employee,
  open,
  onOpenChange,
  assignmentCount,
  onOpenPermissions,
}: EmployeeProfileSheetProps) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canManage = canManageEmployees(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("employee");
  // Keep last employee mounted so the exit slide animation can finish.
  const [displayEmployee, setDisplayEmployee] = useState<CompanyEmployee | null>(employee);

  useEffect(() => {
    if (employee) {
      setDisplayEmployee(employee);
      setDraftRole(employee.role);
      setError(null);
    }
  }, [employee]);

  if (!displayEmployee) return null;

  const activeEmployee = employee ?? displayEmployee;
  const isSelf = activeEmployee.uid === profile?.id;
  const now = Date.now();
  const lastActive = activeEmployee.lastActiveAt?.getTime() ?? 0;
  const online =
    activeEmployee.isActive && lastActive > 0 && now - lastActive <= ONLINE_WINDOW_MS;
  const displayName =
    activeEmployee.fullName?.trim() ||
    (activeEmployee.email.includes("@") ? activeEmployee.email.split("@")[0] : null) ||
    "Сотрудник";
  const openOrdersLabel =
    typeof assignmentCount === "number"
      ? `${assignmentCount} ${
          assignmentCount === 1
            ? "заказ-наряд"
            : assignmentCount < 5
              ? "заказ-наряда"
              : "заказ-нарядов"
        }`
      : null;
  const rolePermissions = ROLE_PERMISSIONS[activeEmployee.role]?.length ?? 0;
  const permissionsLabel =
    activeEmployee.permissions.length === 0
      ? `По роли (${rolePermissions})`
      : `По роли +${activeEmployee.permissions.length}`;

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(role: UserRole) {
    if (!profile || !companyId || isSelf || activeEmployee.role === "owner") return;
    setDraftRole(role);
    await runAction(() =>
      employeeRepository.setEmployeeRole(companyId, profile.id, activeEmployee.uid, role),
    );
  }

  async function handleToggleActive() {
    if (!profile || !companyId || isSelf) return;
    await runAction(() =>
      employeeRepository.setEmployeeActive(
        companyId,
        profile.id,
        activeEmployee.uid,
        !activeEmployee.isActive,
      ),
    );
  }

  async function handleRemove() {
    if (!profile || !companyId || isSelf) return;
    await runAction(async () => {
      await employeeRepository.removeEmployee(companyId, profile.id, activeEmployee.uid);
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l bg-background p-0 sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="border-b border-border/70 px-5 py-5 text-left">
          <SheetTitle className="sr-only">Профиль сотрудника</SheetTitle>
          <SheetDescription className="sr-only">
            Карточка сотрудника {displayName}
          </SheetDescription>

          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <UserAvatar
              photoURL={activeEmployee.photoURL}
              displayName={displayName}
              email={activeEmployee.email}
              seed={activeEmployee.uid || activeEmployee.id}
              size="lg"
              className="[&>img]:size-20 [&>span]:size-20 [&>span]:text-lg"
            />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-tight">
                {displayName}
                {isSelf ? (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">(вы)</span>
                ) : null}
              </p>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{activeEmployee.email || "—"}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <StatusIndicator color={online ? "emerald" : "amber"} pulse={online} />
                  {online ? "Онлайн" : activeEmployee.isActive ? "Не в сети" : "Отключён"}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {formatRole(activeEmployee.role)}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <ProfileRow label="Роль">
              {canManage && !isSelf && activeEmployee.role !== "owner" ? (
                <Select
                  value={draftRole}
                  onValueChange={(value) => void handleRoleChange(value as UserRole)}
                  disabled={busy}
                >
                  <SelectTrigger className="h-8 w-44 border-0 bg-transparent shadow-none">
                    <SelectValue>{formatRole(draftRole)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                formatRole(activeEmployee.role)
              )}
            </ProfileRow>

            <ProfileRow label="Статус">
              {canManage && !isSelf ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={busy}
                  onClick={() => void handleToggleActive()}
                >
                  {activeEmployee.isActive ? "Активен" : "Отключён"}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Button>
              ) : (
                <span>{activeEmployee.isActive ? "Активен" : "Отключён"}</span>
              )}
            </ProfileRow>

            <ProfileRow label="Права">
              {canManage && onOpenPermissions ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => onOpenPermissions(activeEmployee)}
                >
                  {permissionsLabel}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Button>
              ) : (
                <span className="text-muted-foreground">{permissionsLabel}</span>
              )}
            </ProfileRow>

            <ProfileRow label="Нагрузка">
              <Link
                href="/work-orders"
                className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary"
                onClick={() => onOpenChange(false)}
              >
                <ClipboardList className="size-3.5 text-muted-foreground" />
                {openOrdersLabel ?? "Заказ-наряды"}
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            </ProfileRow>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
            <ProfileRow label="ID">
              <span className="font-mono text-xs text-muted-foreground">
                {(activeEmployee.uid || activeEmployee.id).slice(0, 12)}…
              </span>
            </ProfileRow>
            {activeEmployee.lastActiveAt ? (
              <ProfileRow label="Был в сети">
                <span className="text-muted-foreground">
                  {activeEmployee.lastActiveAt.toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </ProfileRow>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {canManage && !isSelf ? (
            <div className="mt-6 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={busy}
                onClick={() => void handleToggleActive()}
              >
                <UserRound className="size-4" />
                {activeEmployee.isActive ? "Отключить доступ" : "Включить доступ"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start gap-2"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                <UserX className="size-4" />
                Удалить из команды
              </Button>
            </div>
          ) : null}

          {canManage && onOpenPermissions ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full justify-start gap-2"
              onClick={() => onOpenPermissions(activeEmployee)}
            >
              <Shield className="size-4" />
              Дополнительные права
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
