"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
import { formatRole, getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const employeeRepository = createEmployeeRbacRepository();
const ASSIGNABLE_ROLES = USER_ROLES.filter((role) => role !== "owner");
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

const sheetReveal = {
  hidden: { opacity: 0, x: 56, scale: 0.985 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.06,
      delayChildren: 0.12,
    },
  },
};

const sheetRevealItem = {
  hidden: { opacity: 0, x: 18, y: 4 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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
  const reduceMotion = useReducedMotion();
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

  const activeEmployee = employee ?? displayEmployee;
  if (!activeEmployee) return null;
  const member = activeEmployee;

  const isSelf = member.uid === profile?.id;
  const now = Date.now();
  const lastActive = member.lastActiveAt?.getTime() ?? 0;
  const online =
    member.isActive && lastActive > 0 && now - lastActive <= ONLINE_WINDOW_MS;
  const sheet = userCopy.employees.profileSheet;
  const displayName =
    member.fullName?.trim() ||
    (member.email.includes("@") ? member.email.split("@")[0] : null) ||
    sheet.fallbackName;
  const openOrdersLabel =
    typeof assignmentCount === "number"
      ? `${assignmentCount} ${
          assignmentCount === 1
            ? sheet.workOrderOne
            : assignmentCount < 5
              ? sheet.workOrderFew
              : sheet.workOrderMany
        }`
      : null;
  const rolePermissions = ROLE_PERMISSIONS[member.role]?.length ?? 0;
  const permissionsLabel =
    member.permissions.length === 0
      ? sheet.permissionsByRole(rolePermissions)
      : sheet.permissionsByRoleExtra(member.permissions.length);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userCopy.employees.profileSheet.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(role: UserRole) {
    if (!profile || !companyId || isSelf || member.role === "owner") return;
    setDraftRole(role);
    await runAction(() =>
      employeeRepository.setEmployeeRole(companyId, profile.id, member.uid, role),
    );
  }

  async function handleToggleActive() {
    if (!profile || !companyId || isSelf) return;
    await runAction(() =>
      employeeRepository.setEmployeeActive(
        companyId,
        profile.id,
        member.uid,
        !member.isActive,
      ),
    );
  }

  async function handleRemove() {
    if (!profile || !companyId || isSelf) return;
    await runAction(async () => {
      await employeeRepository.removeEmployee(companyId, profile.id, member.uid);
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden border-l bg-background p-0 sm:max-w-md"
        showCloseButton
      >
        <motion.div
          key={member.uid || member.id}
          className="flex h-full min-h-0 flex-col"
          variants={reduceMotion ? undefined : sheetReveal}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
        >
          <motion.div variants={reduceMotion ? undefined : sheetRevealItem}>
            <SheetHeader className="border-b border-border/70 px-5 py-5 text-left">
          <SheetTitle className="sr-only">{sheet.title}</SheetTitle>
          <SheetDescription className="sr-only">
            {sheet.description(displayName)}
          </SheetDescription>

          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <UserAvatar
              photoURL={member.photoURL}
              displayName={displayName}
              email={member.email}
              seed={member.uid || member.id}
              size="lg"
              className="[&>img]:size-20 [&>span]:size-20 [&>span]:text-lg"
            />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-tight">
                {displayName}
                {isSelf ? (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">{userCopy.employees.youSuffix}</span>
                ) : null}
              </p>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{member.email || "—"}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <StatusIndicator color={online ? "emerald" : "amber"} pulse={online} />
                  {online ? sheet.online : member.isActive ? sheet.offline : sheet.disabled}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {formatRole(member.role)}
                </Badge>
              </div>
            </div>
            </div>
          </SheetHeader>
          </motion.div>

          <motion.div
            variants={reduceMotion ? undefined : sheetRevealItem}
            className="flex-1 overflow-y-auto px-5 py-5"
          >
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <ProfileRow label={sheet.role}>
              {canManage && !isSelf && member.role !== "owner" ? (
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
                formatRole(member.role)
              )}
            </ProfileRow>

            <ProfileRow label={sheet.status}>
              {canManage && !isSelf ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={busy}
                  onClick={() => void handleToggleActive()}
                >
                  {member.isActive ? userCopy.employees.statusActive : sheet.disabled}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Button>
              ) : (
                <span>{member.isActive ? userCopy.employees.statusActive : sheet.disabled}</span>
              )}
            </ProfileRow>

            <ProfileRow label={sheet.permissions}>
              {canManage && onOpenPermissions ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => onOpenPermissions(member)}
                >
                  {permissionsLabel}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Button>
              ) : (
                <span className="text-muted-foreground">{permissionsLabel}</span>
              )}
            </ProfileRow>

            <ProfileRow label={sheet.workload}>
              <Link
                href="/work-orders"
                className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary"
                onClick={() => onOpenChange(false)}
              >
                <ClipboardList className="size-3.5 text-muted-foreground" />
                {openOrdersLabel ?? sheet.workOrders}
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            </ProfileRow>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
            <ProfileRow label="ID">
              <span className="font-mono text-xs text-muted-foreground">
                {(member.uid || member.id).slice(0, 12)}…
              </span>
            </ProfileRow>
            {member.lastActiveAt ? (
              <ProfileRow label={sheet.lastSeen}>
                <span className="text-muted-foreground">
                  {member.lastActiveAt.toLocaleString(
                    getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU",
                    {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
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
                {member.isActive ? sheet.disableAccess : sheet.enableAccess}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start gap-2"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                <UserX className="size-4" />
                {sheet.removeFromTeam}
              </Button>
            </div>
          ) : null}

          {canManage && onOpenPermissions ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full justify-start gap-2"
              onClick={() => onOpenPermissions(member)}
            >
              <Shield className="size-4" />
              {sheet.extraPermissions}
            </Button>
          ) : null}
          </motion.div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
