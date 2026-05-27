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
import { PERMISSIONS, Permission, USER_ROLES, UserRole } from "@/domain/user";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { createInviteRepository } from "@/infrastructure/firestore/invite-repository";
import { Button } from "@/components/ui/button";
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
import { formatPermission, formatRole } from "@/lib/user-copy";

const employeeRepository = createEmployeeRbacRepository();
const inviteRepository = createInviteRepository();

const INVITE_ROLES = USER_ROLES.filter((role) => role !== "owner");

function formatInviteExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmployeesWorkspace() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [invites, setInvites] = useState<InviteDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>("employee");
  const [inviteTtlHours, setInviteTtlHours] = useState(72);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
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
        setError(nextError.message);
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
        setError(nextError.message);
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
      setInviteRole("employee");
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
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать код приглашения");
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

  async function deleteInvite(invite: InviteDocument) {
    try {
      await inviteRepository.deleteInvite(invite.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить приглашение");
    }
  }

  async function updateRole(employee: CompanyEmployee, role: UserRole) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.setEmployeeRole(companyId, profile.id, employee.uid, role);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить роль");
    }
  }

  async function toggleActive(employee: CompanyEmployee) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.setEmployeeActive(companyId, profile.id, employee.uid, !employee.isActive);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить статус");
    }
  }

  async function removeEmployee(employee: CompanyEmployee) {
    if (!profile || !companyId || employee.uid === profile.id) return;
    setError(null);
    try {
      await employeeRepository.removeEmployee(companyId, profile.id, employee.uid);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить сотрудника");
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
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить права");
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
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Card>
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
                  <TableHead>Email</TableHead>
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
                      <TableCell>{employee.fullName || "—"}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <Select
                            value={employee.role}
                            onValueChange={(value) => updateRole(employee, value as UserRole)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map((role) => (
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
                      <TableCell>{employee.permissions.length}</TableCell>
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
              Создайте код приглашения и передайте его новому сотруднику. Он вводит код при входе в AutoCore.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium">Роль</p>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRole(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="rounded-lg border bg-muted/40 p-4 text-center">
                <p className="mb-2 text-sm text-muted-foreground">Код приглашения</p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em]">{generatedCode}</p>
                <Button variant="outline" className="mt-3" onClick={() => void copyInviteCode()}>
                  <Copy className="mr-2 size-4" />
                  Скопировать
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
