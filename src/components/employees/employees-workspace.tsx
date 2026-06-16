"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";

import { canManageEmployees, canViewEmployees } from "@/lib/auth/permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useDeepAction } from "@/hooks/use-deep-action";
import { normalizeCompanyId } from "@/lib/company-id";
import { CompanyEmployee, InviteDocument } from "@/domain/rbac";
import { PERMISSIONS, Permission, ROLE_PERMISSIONS, USER_ROLES, UserRole } from "@/domain/user";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { createInviteRepository } from "@/infrastructure/firestore/invite-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatPermission, formatRole, userCopy } from "@/lib/user-copy";
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

const INVITE_ROLE_HINTS: Partial<Record<UserRole, string>> = {
  mechanic: "Заказ-наряды, клиенты, авто",
  diagnostician: "Заказ-наряды и диагностика",
  manager: "Управление и отчёты",
  accountant: "Бухгалтерия",
  employee: "Базовый просмотр",
  admin: "Полный доступ",
};

function formatInviteExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapEmployeeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Missing or insufficient permissions")) {
    return "Недостаточно прав. Обновите страницу — если ошибка повторится, правила Firebase ещё не обновились.";
  }
  return message || "Не удалось выполнить действие";
}

function employeeDisplayName(
  employee: CompanyEmployee,
  self?: { id?: string; displayName?: string | null; email?: string },
): string {
  if (employee.fullName?.trim()) return employee.fullName.trim();
  if (employee.uid === self?.id && self.displayName?.trim()) return self.displayName.trim();
  if (employee.email?.includes("@")) return employee.email.split("@")[0] ?? employee.email;
  return "Сотрудник";
}

function permissionsSummary(employee: CompanyEmployee): string {
  const extra = employee.permissions.length;
  if (extra === 0) return `По роли (${ROLE_PERMISSIONS[employee.role]?.length ?? 0})`;
  return `+${extra} доп.`;
}

const ASSIGNABLE_ROLES = USER_ROLES.filter((role) => role !== "owner");

export function EmployeesWorkspace({ embedded = false }: { embedded?: boolean } = {}) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [invites, setInvites] = useState<InviteDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>("mechanic");
  const [inviteTtlHours, setInviteTtlHours] = useState(72);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [emailInviteSent, setEmailInviteSent] = useState<string | null>(null);
  const [emailInviteJoinUrl, setEmailInviteJoinUrl] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<CompanyEmployee | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

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
    if (!subscriptionsEnabled || !canManage) return;
    const unsubscribe = inviteRepository.subscribeInvites(
      companyId,
      (next) => {
        setInvites(next);
        setInvitesLoaded(true);
      },
      (nextError) => {
        setError(mapEmployeeError(nextError));
        setInvitesLoaded(true);
      },
    );
    return () => unsubscribe();
  }, [canManage, companyId, subscriptionsEnabled]);

  const activeCount = useMemo(
    () => (subscriptionsEnabled ? employees : []).filter((employee) => employee.isActive).length,
    [employees, subscriptionsEnabled],
  );

  const activeInvites = useMemo(
    () => invites.filter((invite) => !invite.used),
    [invites],
  );

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
      const invite = await inviteRepository.createInvite({
        companyId,
        role: inviteRole,
        createdBy: profile.id,
        ttlHours: inviteTtlHours,
      });
      setGeneratedCode(invite.code);
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
      setError("Не удалось скопировать код");
    }
  }

  async function sendEmailInvite() {
    if (!profile || !companyId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Укажите корректный email");
      return;
    }
    setBusy(true);
    setError(null);
    setEmailInviteSent(null);
    setEmailInviteJoinUrl(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("Войдите в аккаунт");
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
          setEmailInviteSent("Сервис почты не настроен — скопируйте ссылку и отправьте сотруднику вручную.");
          return;
        }
        throw new Error(payload.error ?? "Не удалось отправить приглашение");
      }
      setEmailInviteJoinUrl(payload.joinUrl ?? null);
      setEmailInviteSent(`Приглашение отправлено на ${payload.email ?? email}`);
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
        title="Команда доступна на Pro"
        description="Управление сотрудниками и приглашениями включается на тарифе Pro."
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
            <CardTitle>Доступ ограничен</CardTitle>
            <CardDescription>У вас нет прав на просмотр сотрудников компании.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <section className={cn("flex w-full flex-col gap-4", !embedded && "mx-auto max-w-6xl")}>
      <Card className={embedded ? "border-0 bg-transparent shadow-none" : undefined}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Сотрудники</CardTitle>
            <CardDescription>
              Активно: {activeCount} из {subscriptionsEnabled ? employees.length : 0}
            </CardDescription>
          </div>
          {canManage ? (
            <Button onClick={openInviteDialog}>Пригласить сотрудника</Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {!loaded && subscriptionsEnabled ? (
            <p className="text-sm text-muted-foreground">Загрузка сотрудников…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>{userCopy.account.emailLabel}</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Права</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subscriptionsEnabled ? employees : []).map((employee) => {
                  const isSelf = employee.uid === profile?.id;
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employeeDisplayName(employee, profile ?? undefined)}
                        {isSelf ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">(вы)</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
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
                          {employee.isActive ? "Активен" : "Отключен"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{permissionsSummary(employee)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canManage}
                            onClick={() => openPermissions(employee)}
                          >
                            Права
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canManage || isSelf}
                            onClick={() => toggleActive(employee)}
                          >
                            {employee.isActive ? "Отключить" : "Включить"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canManage || isSelf}
                            onClick={() => removeEmployee(employee)}
                          >
                            Удалить
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
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Коды приглашений</CardTitle>
            <CardDescription>
              Активных кодов: {activeInvites.length}. Новый сотрудник вводит код при входе в AutoCore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!invitesLoaded ? (
              <p className="text-sm text-muted-foreground">Загрузка приглашений…</p>
            ) : activeInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет активных кодов приглашения.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono tracking-wider">{invite.code}</TableCell>
                      <TableCell>{formatRole(invite.role)}</TableCell>
                      <TableCell>{formatInviteExpiry(invite.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void navigator.clipboard.writeText(invite.code)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteInvite(invite)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить сотрудника</DialogTitle>
            <DialogDescription>
              Отправьте приглашение на email или создайте код для ручной передачи.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Email сотрудника</Label>
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
                  {busy ? "Отправка…" : "Отправить на email"}
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
                      Скопировать ссылку-приглашение
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Сотрудник получит письмо со ссылкой для входа в команду.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Роль нового сотрудника</p>
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
                    {INVITE_ROLE_HINTS[role] ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{INVITE_ROLE_HINTS[role]}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Срок действия: {inviteTtlHours} ч</p>
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
                  Код для роли «{formatRole(inviteRole)}»
                </p>
                <p className="font-mono text-3xl font-bold tracking-[0.25em]">{generatedCode}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Действует {inviteTtlHours} ч · передайте код сотруднику при входе в AutoCore
                </p>
                <Button variant="outline" className="mt-3" onClick={() => void copyInviteCode()}>
                  <Copy className="mr-2 size-4" />
                  Скопировать код
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {generatedCode ? "Готово" : "Отмена"}
            </Button>
            <Button disabled={busy} onClick={() => void createInviteCode()}>
              {busy ? "Создание…" : generatedCode ? "Создать ещё" : "Создать код"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEmployee != null} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Права сотрудника</DialogTitle>
            <DialogDescription>
              Дополнительные права поверх роли для {selectedEmployee?.fullName || selectedEmployee?.email}.
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
              Отмена
            </Button>
            <Button onClick={() => void saveOverrides()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
