"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { useBillingGate } from "@/components/billing/billing-gate-provider";

import { canManageEmployees, canViewEmployees } from "@/lib/auth/permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeCompanyId } from "@/lib/company-id";
import { PERMISSIONS, Permission, ROLE_PERMISSIONS, USER_ROLES, UserRole } from "@/domain/user";
import { RoleDefinition } from "@/domain/rbac";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPermission, formatRole } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const employeeRepository = createEmployeeRbacRepository();

export function RolesWorkspace({ embedded = false }: { embedded?: boolean } = {}) {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<UserRole | null>(null);

  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);
  const subscriptionsEnabled = Boolean(companyId && canView);

  useEffect(() => {
    if (!subscriptionsEnabled) return;
    const unsubscribe = employeeRepository.subscribeRoles(
      companyId,
      (next) => {
        setRoles(next);
        setLoaded(true);
      },
      (nextError) => {
        setError(nextError.message);
        setLoaded(true);
      },
    );
    return () => unsubscribe();
  }, [companyId, subscriptionsEnabled]);

  async function resetRole(role: UserRole) {
    if (!profile || !companyId) return;
    setBusyRole(role);
    setError(null);
    try {
      await employeeRepository.seedDefaultRoles(companyId, profile.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось применить роли");
    } finally {
      setBusyRole(null);
    }
  }

  const roleById = new Map(roles.map((role) => [role.id, role]));


  if (!isPro) {
    return (
      <ProFeatureGate
        feature="invite"
        title="Роли доступны на Pro"
        description="Гибкая ролевая модель сотрудников доступна на тарифе Pro."
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
            <CardDescription>У вас нет прав на просмотр ролевой модели.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <section className={cn("flex w-full flex-col gap-4", !embedded && "mx-auto max-w-6xl")}>
      <Card className={embedded ? "border-0 bg-transparent shadow-none" : undefined}>
        <CardHeader>
          <CardTitle>Управление ролями</CardTitle>
          <CardDescription>
            Базовая матрица прав по ролям. Дополнительные права настраиваются в карточке сотрудника.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loaded && subscriptionsEnabled ? (
            <p className="text-sm text-muted-foreground">Загрузка ролей…</p>
          ) : (
            <div className="space-y-4">
              {USER_ROLES.map((role, roleIndex) => {
                const persisted = subscriptionsEnabled ? roleById.get(role) : undefined;
                const permissions = persisted?.permissions ?? ROLE_PERMISSIONS[role];
                return (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: roleIndex * 0.04,
                      duration: 0.24,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="rounded-lg border p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{formatRole(role)}</h3>
                        {persisted?.isSystem ? <Badge variant="outline">Системная</Badge> : null}
                      </div>
                      {canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyRole === role}
                          onClick={() => void resetRole(role)}
                        >
                          {busyRole === role ? "Применяем…" : "Сбросить к стандартным"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PERMISSIONS.map((permission: Permission, permissionIndex) => {
                        const active = permissions.includes(permission);
                        return (
                          <motion.div
                            key={permission}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: roleIndex * 0.04 + permissionIndex * 0.012,
                              duration: 0.18,
                            }}
                          >
                            <Badge variant={active ? "default" : "secondary"}>
                              {formatPermission(permission)}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}

