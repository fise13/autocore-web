"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";

import { canManageEmployees, canViewEmployees } from "@/lib/auth/permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { EmployeeProfileSheet } from "@/components/employees/employee-profile-sheet";
import { useDeepAction } from "@/hooks/use-deep-action";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildInviteUrl, normalizeInviteStatus, type InviteStatus } from "@autocore/org";
import { CompanyEmployee, InviteDocument } from "@/domain/rbac";
import { PERMISSIONS, Permission, ROLE_PERMISSIONS, USER_ROLES, UserRole } from "@/domain/user";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { createInviteRepository } from "@/infrastructure/firestore/invite-repository";
import { WorkspaceSection } from "@/components/layout/workspace-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPermission, formatRole, getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const employeeRepository = createEmployeeRbacRepository();
const inviteRepository = createInviteRepository();

const INVITE_ROLES: UserRole[] = [
  "mechanic",
  "diagnostician",
  "manager",
  "accountant",
  "employee",
  "admin",
];

function inviteRoleHints(): Partial<Record<UserRole, string>> {
  return { ...userCopy.employees.roleHints };
}

function inviteStatusLabel(status: InviteStatus): string {
  return userCopy.employees.inviteStatuses[status] ?? status;
}

function formatInviteExpiry(expiresAt: Date): string {
  const locale = getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";
  return expiresAt.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastActive(lastActiveAt?: Date): string {
  if (!lastActiveAt) return "—";
  const deltaMs = Date.now() - lastActiveAt.getTime();
  const copy = userCopy.employees;
  if (deltaMs < 5 * 60 * 1000) return copy.lastActiveNow;
  if (deltaMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(deltaMs / 60_000));
    return copy.lastActiveMinutes(minutes);
  }
  if (deltaMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(deltaMs / 3_600_000));
    return copy.lastActiveHours(hours);
  }
  const locale = getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";
  return lastActiveAt.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapEmployeeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Missing or insufficient permissions")) {
    return userCopy.employees.errorInsufficientPermissions;
  }
  return message || userCopy.employees.errorGeneric;
}

function employeeDisplayName(
  employee: CompanyEmployee,
  self?: { id?: string; displayName?: string | null; email?: string },
): string {
  if (employee.fullName?.trim()) return employee.fullName.trim();
  if (employee.uid === self?.id && self.displayName?.trim()) return self.displayName.trim();
  if (employee.email?.includes("@")) return employee.email.split("@")[0] ?? employee.email;
  return userCopy.employees.fallbackName;
}

function permissionsSummary(employee: CompanyEmployee): string {
  const extra = employee.permissions.length;
  if (extra === 0) {
    return userCopy.employees.permissionsByRole(ROLE_PERMISSIONS[employee.role]?.length ?? 0);
  }
  return userCopy.employees.permissionsExtra(extra);
}

const ASSIGNABLE_ROLES = USER_ROLES.filter((role) => role !== "owner");

export function EmployeesWorkspace({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [invites, setInvites] = useState<InviteDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>("mechanic");
  const [inviteTtlHours, setInviteTtlHours] = useState(72);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [emailInviteSent, setEmailInviteSent] = useState<string | null>(null);
  const [emailInviteJoinUrl, setEmailInviteJoinUrl] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<CompanyEmployee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<CompanyEmployee | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InviteStatus | "all">("all");
  const memberId = searchParams.get("member");

  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);
  const { requirePro, isPro } = useBillingGate();
  const subscriptionsEnabled = Boolean(companyId && canView);

  useEffect(() => {
    if (!subscriptionsEnabled) return;
    const unsubscribe = employeeRepository.subscribeEmployees(
      companyId,
      (next) => {
        setEmployees(next);
        setLoaded(true);
      },
      (nextError) => {
        setError(mapEmployeeError(nextError));
        setLoaded(true);
      },
    );
    return () => unsubscribe();
  }, [companyId, subscriptionsEnabled]);

  useEffect(() => {
    if (!subscriptionsEnabled || !canManage) {
      setInvites([]);
      return;
    }

    const unsubscribe = inviteRepository.subscribeInvites(
      companyId,
      (next) => setInvites(next),
      (nextError) => {
        // Invites are secondary UI — don't block the employees table with a red banner
        // (missing index / rules lag often surfaces as permission-denied here).
        console.warn("[employees] invites subscription failed:", nextError);
        setInvites([]);
      },
    );
    return () => unsubscribe();
  }, [canManage, companyId, subscriptionsEnabled]);

  const activeCount = useMemo(
    () => (subscriptionsEnabled ? employees : []).filter((employee) => employee.isActive).length,
    [employees, subscriptionsEnabled],
  );

  const activeInvites = useMemo(
    () =>
      invites.filter((invite) => {
        const status = normalizeInviteStatus({
          status: invite.status,
          used: invite.used,
          expiresAt: invite.expiresAt.toISOString(),
        });
        return status === "pending";
      }),
    [invites],
  );

  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      if (inviteStatusFilter === "all") return true;
      const status = normalizeInviteStatus({
        status: invite.status,
        used: invite.used,
        expiresAt: invite.expiresAt.toISOString(),
      });
      return status === inviteStatusFilter;
    });
  }, [inviteStatusFilter, invites]);

  async function resendInvite(invite: InviteDocument) {
    setBusy(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/invites/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteId: invite.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? userCopy.employees.errorResend);
      if (payload.joinUrl) {
        await navigator.clipboard.writeText(payload.joinUrl);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(invite: InviteDocument) {
    setBusy(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteId: invite.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? userCopy.employees.errorCancel);
    } finally {
      setBusy(false);
    }
  }

  function openInviteDialog() {
    requirePro("invite", () => {
      setGeneratedCode(null);
      setInviteRole("mechanic");
      setInviteTtlHours(72);
      setInviteOpen(true);
    });
  }

  useDeepAction({
    expectedAction: "invite",
    onAction: openInviteDialog,
  });

  useEffect(() => {
    if (!memberId || employees.length === 0) return;
    const found = employees.find(
      (employee) => employee.id === memberId || employee.uid === memberId,
    );
    if (found) setProfileEmployee(found);
  }, [employees, memberId]);

  function clearMemberParam() {
    if (!memberId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("member");
    const query = params.toString();
    router.replace(query ? `/team?${query}` : embedded ? "/team?tab=employees" : "/team?tab=employees", {
      scroll: false,
    });
  }

  function openProfile(employee: CompanyEmployee) {
    setProfileEmployee(employee);
  }

  function openPermissions(employee: CompanyEmployee) {
    setSelectedEmployee(employee);
    setSelectedPermissions(new Set(employee.permissions));
  }

  async function createInviteCode() {
    if (!profile || !companyId) return;
    setBusy(true);
    setError(null);
    setGeneratedCode(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error(userCopy.employees.errorSignIn);
      const token = await user.getIdToken();
      const response = await fetch("/api/invites/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: inviteRole,
          ttlHours: inviteTtlHours,
        }),
      });
      const payload = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? userCopy.employees.errorCreateInvite);
      }
      setGeneratedCode(payload.code ?? null);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteCode() {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch {
      setError(userCopy.employees.errorCopyCode);
    }
  }

  async function sendEmailInvite() {
    if (!profile || !companyId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError(userCopy.employees.errorInvalidEmail);
      return;
    }
    setBusy(true);
    setError(null);
    setEmailInviteSent(null);
    setEmailInviteJoinUrl(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error(userCopy.employees.errorSignIn);
      const token = await user.getIdToken();
      const response = await fetch("/api/invites/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: inviteRole,
          ttlHours: inviteTtlHours,
        }),
      });
      const payload = (await response.json()) as { error?: string; joinUrl?: string; email?: string };
      if (!response.ok) {
        if (response.status === 503 && payload.joinUrl) {
          setEmailInviteJoinUrl(payload.joinUrl);
          setEmailInviteSent(userCopy.employees.mailNotConfigured);
          return;
        }
        throw new Error(payload.error ?? userCopy.employees.errorSendInvite);
      }
      setEmailInviteJoinUrl(payload.joinUrl ?? null);
      setEmailInviteSent(userCopy.employees.inviteSent(payload.email ?? email));
      setInviteEmail("");
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function deleteInvite(invite: InviteDocument) {
    try {
      await inviteRepository.deleteInvite(invite.id);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    }
  }

  async function updateRole(employee: CompanyEmployee, role: UserRole) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.setEmployeeRole(companyId, profile.id, employee.uid, role);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    }
  }

  async function toggleActive(employee: CompanyEmployee) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.setEmployeeActive(companyId, profile.id, employee.uid, !employee.isActive);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    }
  }

  async function removeEmployee(employee: CompanyEmployee) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.removeEmployee(companyId, profile.id, employee.uid);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    }
  }

  async function saveOverrides() {
    if (!selectedEmployee || !profile || !companyId) return;
    setError(null);
    try {
      await employeeRepository.setPermissionOverrides(
        companyId,
        profile.id,
        selectedEmployee.uid,
        [...selectedPermissions],
      );
      setSelectedEmployee(null);
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
    }
  }


  if (!isPro) {
    return (
      <ProFeatureGate
        feature="invite"
        title={userCopy.employees.proTitle}
        description={userCopy.employees.proDescription}
      >
        <></>
      </ProFeatureGate>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>{userCopy.employees.accessDeniedTitle}</CardTitle>
            <CardDescription>{userCopy.employees.accessDeniedDescription}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <section className={cn("flex w-full flex-col gap-8", !embedded && "mx-auto max-w-6xl gap-4")}>
      <WorkspaceSection
        embedded={embedded}
        title={userCopy.employees.title}
        description={userCopy.employees.activeCount(
          activeCount,
          subscriptionsEnabled ? employees.length : 0,
        )}
        action={
          canManage ? (
            <Button onClick={openInviteDialog}>{userCopy.employees.inviteEmployee}</Button>
          ) : null
        }
      >
          {!loaded && subscriptionsEnabled ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">{userCopy.employees.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{userCopy.employees.columns.employee}</TableHead>
                  <TableHead>{userCopy.account.emailLabel}</TableHead>
                  <TableHead>{userCopy.employees.columns.role}</TableHead>
                  <TableHead>{userCopy.employees.columns.status}</TableHead>
                  <TableHead>{userCopy.employees.columns.activity}</TableHead>
                  <TableHead>{userCopy.employees.columns.permissions}</TableHead>
                  <TableHead className="text-right">{userCopy.employees.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subscriptionsEnabled ? employees : []).map((employee) => {
                  const isSelf = employee.uid === profile?.id;
                  return (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer"
                      onClick={() => openProfile(employee)}
                    >
                      <TableCell className="font-medium">
                        {employeeDisplayName(employee, profile ?? undefined)}
                        {isSelf ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">{userCopy.employees.youSuffix}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {canManage && !isSelf && employee.role !== "owner" ? (
                          <Select
                            value={employee.role}
                            onValueChange={(value) => updateRole(employee, value as UserRole)}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue>{formatRole(employee.role)}</SelectValue>
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
                          formatRole(employee.role)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "outline" : "secondary"}>
                          {employee.isActive
                            ? userCopy.employees.statusActive
                            : userCopy.employees.statusDisabled}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLastActive(employee.lastActiveAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{permissionsSummary(employee)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="inline-flex items-center gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProfile(employee)}
                          >
                            {userCopy.employees.profile}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canManage}
                            onClick={() => openPermissions(employee)}
                          >
                            {userCopy.employees.permissions}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canManage || isSelf}
                            onClick={() => toggleActive(employee)}
                          >
                            {employee.isActive ? userCopy.employees.disable : userCopy.employees.enable}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canManage || isSelf}
                            onClick={() => removeEmployee(employee)}
                          >
                            {userCopy.employees.remove}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </WorkspaceSection>

      {canManage ? (
        <WorkspaceSection
          embedded={embedded}
          title={userCopy.employees.invitesTitle}
          description={userCopy.employees.invitesDescription(activeInvites.length)}
          action={
            <Select
              value={inviteStatusFilter}
              onValueChange={(value) => setInviteStatusFilter(value as InviteStatus | "all")}
            >
              <SelectTrigger className="w-44">
                <SelectValue>
                  {inviteStatusFilter === "all"
                    ? userCopy.employees.allStatuses
                    : inviteStatusLabel(inviteStatusFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{userCopy.employees.allStatuses}</SelectItem>
                {(Object.keys(userCopy.employees.inviteStatuses) as InviteStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {inviteStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          className={embedded ? "border-t border-border/60 pt-6" : undefined}
        >
            {filteredInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">{userCopy.employees.invitesEmpty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{userCopy.employees.inviteColumns.code}</TableHead>
                    <TableHead>{userCopy.employees.inviteColumns.role}</TableHead>
                    <TableHead>{userCopy.employees.inviteColumns.status}</TableHead>
                    <TableHead>{userCopy.employees.inviteColumns.expires}</TableHead>
                    <TableHead className="text-right">{userCopy.employees.inviteColumns.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((invite) => {
                    const status = normalizeInviteStatus({
                      status: invite.status,
                      used: invite.used,
                      expiresAt: invite.expiresAt.toISOString(),
                    });
                    return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono tracking-wider">{invite.code}</TableCell>
                      <TableCell>{formatRole(invite.role)}</TableCell>
                      <TableCell>
                        <Badge variant={status === "pending" ? "secondary" : "outline"}>
                          {inviteStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatInviteExpiry(invite.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {invite.token ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void navigator.clipboard.writeText(buildInviteUrl(invite.token!))
                              }
                            >
                              {userCopy.employees.link}
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void navigator.clipboard.writeText(invite.code)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          {status === "pending" && invite.email ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void resendInvite(invite)}
                            >
                              {userCopy.employees.resend}
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void revokeInvite(invite)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
        </WorkspaceSection>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userCopy.employees.inviteDialogTitle}</DialogTitle>
            <DialogDescription>
              {userCopy.employees.inviteDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">{userCopy.employees.inviteEmailLabel}</Label>
              <div className="flex gap-2">
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@company.ru"
                  disabled={busy}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendEmailInvite();
                    }
                  }}
                />
                <Button type="button" disabled={busy} onClick={() => void sendEmailInvite()}>
                  {busy ? userCopy.employees.sending : userCopy.employees.sendEmail}
                </Button>
              </div>
              {emailInviteSent ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{emailInviteSent}</p>
                  {emailInviteJoinUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void navigator.clipboard.writeText(emailInviteJoinUrl)}
                    >
                      <Copy className="mr-2 size-4" />
                      {userCopy.employees.copyInviteLink}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {userCopy.employees.inviteEmailHint}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">{userCopy.employees.newEmployeeRole}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {INVITE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInviteRole(role)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      inviteRole === role
                        ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                        : "border-border/60 bg-card hover:bg-muted/30",
                    )}
                  >
                    <p className="text-sm font-medium">{formatRole(role)}</p>
                    {inviteRoleHints()[role] ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{inviteRoleHints()[role]}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">{userCopy.employees.ttlHours(inviteTtlHours)}</p>
              <input
                type="range"
                min={6}
                max={168}
                step={6}
                value={inviteTtlHours}
                onChange={(event) => setInviteTtlHours(Number(event.target.value))}
                className="w-full"
              />
            </div>

            {generatedCode ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="mb-1 text-sm text-muted-foreground">
                  {userCopy.employees.codeForRole(formatRole(inviteRole))}
                </p>
                <p className="font-mono text-3xl font-bold tracking-[0.25em]">{generatedCode}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {userCopy.employees.codeHint(inviteTtlHours)}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => void copyInviteCode()}>
                  <Copy className="mr-2 size-4" />
                  {userCopy.employees.copyCode}
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {generatedCode ? userCopy.employees.done : userCopy.employees.cancel}
            </Button>
            <Button disabled={busy} onClick={() => void createInviteCode()}>
              {busy
                ? userCopy.employees.creating
                : generatedCode
                  ? userCopy.employees.createAnother
                  : userCopy.employees.createCode}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeProfileSheet
        employee={
          profileEmployee
            ? (employees.find(
                (employee) =>
                  employee.id === profileEmployee.id || employee.uid === profileEmployee.uid,
              ) ?? profileEmployee)
            : null
        }
        open={profileEmployee != null}
        onOpenChange={(open) => {
          if (!open) {
            setProfileEmployee(null);
            clearMemberParam();
          }
        }}
        onOpenPermissions={(employee) => {
          openPermissions(employee);
        }}
      />

      <Dialog open={selectedEmployee != null} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userCopy.employees.permissionsDialogTitle}</DialogTitle>
            <DialogDescription>
              {userCopy.employees.permissionsDialogDescription(
                selectedEmployee?.fullName || selectedEmployee?.email || "",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {PERMISSIONS.map((permission) => {
              const checked = selectedPermissions.has(permission);
              return (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedPermissions((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(permission);
                        else next.delete(permission);
                        return next;
                      });
                    }}
                  />
                  {formatPermission(permission)}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
              {userCopy.employees.cancel}
            </Button>
            <Button onClick={() => void saveOverrides()}>{userCopy.employees.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
