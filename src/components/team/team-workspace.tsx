"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  ActivityIcon,
  LayoutGridIcon,
  ShieldIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { EnterpriseAnimatedPanel } from "@/components/layout/enterprise-animated-panel";
import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseQuickLink } from "@/components/layout/enterprise-quick-link";
import { EnterpriseWorkspaceNav } from "@/components/layout/enterprise-workspace-nav";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { TeamOnDutyList } from "@/components/team/team-on-duty-list";
import { EmployeesWorkspace } from "@/components/employees/employees-workspace";
import { RolesWorkspace } from "@/components/employees/roles-workspace";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useDeepAction } from "@/hooks/use-deep-action";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canManageEmployees, canViewEmployees } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";
import { computeOpenWorkOrderCounts } from "@/lib/team/compute-open-work-order-counts";
import { userCopy } from "@/lib/user-copy";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const workOrderRepository = createWorkOrderRepository();
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

type TeamTab = "overview" | "employees" | "roles";

const TEAM_NAV = [
  { id: "overview", label: "На смене", icon: LayoutGridIcon },
  { id: "employees", label: userCopy.settings.employees, icon: UsersIcon },
  { id: "roles", label: userCopy.settings.roles, icon: ShieldIcon },
  { id: "activity", label: "Активность", icon: ActivityIcon, href: "/activity" },
] as const;

function resolveTeamTab(value: string | null): TeamTab {
  if (value === "employees" || value === "roles") return value;
  return "overview";
}

function TeamWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const tab = resolveTeamTab(searchParams.get("tab"));
  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);

  const { employees, isLoading: employeesLoading } = useEmployeesRealtime(
    companyId,
    Boolean(companyId && canView && isPro),
  );

  const { orders: workOrders, isLoading: workOrdersLoading } = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    Boolean(companyId && canView && isPro),
  );

  const assignmentCounts = useMemo(() => computeOpenWorkOrderCounts(workOrders), [workOrders]);
  const loading = employeesLoading || workOrdersLoading;

  const stats = useMemo(() => {
    const now = Date.now();
    const active = employees.filter((employee) => employee.isActive);
    const online = active.filter((employee) => {
      const lastActive = employee.lastActiveAt?.getTime() ?? 0;
      return lastActive > 0 && now - lastActive <= ONLINE_WINDOW_MS;
    }).length;
    const openOrders = [...assignmentCounts.values()].reduce((sum, count) => sum + count, 0);
    return { total: active.length, online, openOrders };
  }, [assignmentCounts, employees]);

  function setTab(next: TeamTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    router.replace(`/team?${params.toString()}`, { scroll: false });
  }

  useDeepAction({
    expectedAction: "invite",
    onAction: () => {
      if (canManage) setTab("employees");
    },
  });

  if (!canView) {
    return (
      <EnterpriseWorkspaceShell title="Команда" description="Доступ к разделу ограничен">
        <EnterprisePanelCard title="Нет доступа" contentClassName="px-6 py-10 text-center text-sm text-muted-foreground">
          У вашей роли нет прав на просмотр команды.
        </EnterprisePanelCard>
      </EnterpriseWorkspaceShell>
    );
  }

  return (
    <EnterpriseWorkspaceShell
      title="Команда"
      description="Сотрудники, роли, нагрузка по заказ-нарядам и журнал действий."
      meta={
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{stats.total} активных</Badge>
          <Badge variant="outline">{stats.online} онлайн</Badge>
          <Badge variant="outline">{stats.openOrders} заказ-нарядов</Badge>
        </div>
      }
      action={
        canManage ? (
          <Button type="button" onClick={() => router.push(deepActionRoutes.invite())}>
            <UserPlusIcon data-icon="inline-start" />
            Пригласить
          </Button>
        ) : null
      }
    >
      <ProFeatureGate
        feature="invite"
        title="Команда доступна на Pro"
        description="Управление сотрудниками и журнал активности — на тарифе Pro."
      >
        <div className="flex flex-col gap-5">
          <EnterpriseWorkspaceNav
            layoutId="team-workspace-nav"
            items={[...TEAM_NAV]}
            activeId={tab}
            onSelect={(id) => {
              if (id === "activity") return;
              setTab(id as TeamTab);
            }}
          />

          <EnterpriseAnimatedPanel panelKey={tab}>
            {tab === "overview" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <EnterprisePanelCard
                  title="Команда на смене"
                  description="Кто онлайн и сколько заказ-нарядов ведёт"
                >
                  {loading ? (
                    <div className="flex flex-col gap-2 p-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <TeamOnDutyList employees={employees} assignmentCounts={assignmentCounts} />
                  )}
                </EnterprisePanelCard>

                <EnterprisePanelCard
                  title="Разделы"
                  description="Переходы внутри команды"
                  contentClassName="flex flex-col gap-1 p-2"
                >
                  <EnterpriseQuickLink
                    icon={UsersIcon}
                    label={userCopy.settings.employees}
                    hint="Приглашения и статусы"
                    onClick={() => setTab("employees")}
                  />
                  <EnterpriseQuickLink
                    icon={ShieldIcon}
                    label={userCopy.settings.roles}
                    hint="Системные и кастомные роли"
                    onClick={() => setTab("roles")}
                  />
                  <EnterpriseQuickLink
                    icon={ActivityIcon}
                    label="Журнал активности"
                    hint="События по всей компании"
                    href="/activity"
                  />
                </EnterprisePanelCard>
              </div>
            ) : null}

            {tab === "employees" ? <EmployeesWorkspace embedded /> : null}
            {tab === "roles" ? <RolesWorkspace embedded /> : null}
          </EnterpriseAnimatedPanel>
        </div>
      </ProFeatureGate>
    </EnterpriseWorkspaceShell>
  );
}

export function TeamWorkspace() {
  return (
    <Suspense fallback={null}>
      <TeamWorkspaceContent />
    </Suspense>
  );
}
