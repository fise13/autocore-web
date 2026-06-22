"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ActivityLogJournal } from "@/components/activity/activity-log-journal";
import { WorkspaceActivityFeed } from "@/components/activity/workspace-activity-feed";
import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseWorkspaceNav } from "@/components/layout/enterprise-workspace-nav";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useActivityLogRealtime } from "@/hooks/use-activity-log-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActivityIcon,
  LayoutGridIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { enrichActivityLogs } from "@/lib/mission-control/enrich-activity-logs";
import { canViewEmployees } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";

const ACTIVITY_NAV = [
  { id: "overview", label: "На смене", icon: LayoutGridIcon, href: "/team" },
  { id: "employees", label: userCopy.settings.employees, icon: UsersIcon, href: "/team?tab=employees" },
  { id: "roles", label: userCopy.settings.roles, icon: ShieldIcon, href: "/team?tab=roles" },
  { id: "activity", label: "Активность", icon: ActivityIcon },
] as const;

export function ActivityWorkspace() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canView = canViewEmployees(profile) && isPro;

  const { employees } = useEmployeesRealtime(companyId, Boolean(companyId && canView));

  const { entries, isLoading, error: errorMessage } = useActivityLogRealtime(
    companyId,
    Boolean(companyId && canView),
  );

  const enrichedEntries = useMemo(
    () => enrichActivityLogs(entries, employees),
    [employees, entries],
  );

  if (!canView) {
    return (
      <EnterpriseWorkspaceShell title="Активность" description="Журнал событий компании">
        <EnterprisePanelCard
          title="Pro и права команды"
          contentClassName="px-6 py-10 text-center text-sm text-muted-foreground"
        >
          Журнал активности доступен на тарифе Pro для ролей с доступом к команде.
        </EnterprisePanelCard>
      </EnterpriseWorkspaceShell>
    );
  }

  return (
    <EnterpriseWorkspaceShell
      title="Активность"
      description="Операционные сигналы: склад, бухгалтерия, заказ-наряды, сотрудники и настройки."
      meta={<Badge variant="secondary">{enrichedEntries.length} событий в журнале</Badge>}
      action={
        <Button type="button" variant="outline" render={<Link href="/team" />}>
          К команде
        </Button>
      }
    >
      <ProFeatureGate
        feature="invite"
        title="Активность доступна на Pro"
        description="Журнал событий компании открывается на тарифе Pro."
      >
        <div className="flex flex-col gap-5">
          <EnterpriseWorkspaceNav
            layoutId="team-workspace-nav"
            items={[...ACTIVITY_NAV]}
            activeId="activity"
            onSelect={() => undefined}
          />

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] xl:items-start">
            <EnterprisePanelCard
              title="Лента событий"
              description="Компактный вид, как в центре управления"
              className="xl:sticky xl:top-4 xl:max-h-[min(72vh,720px)] xl:self-start"
              contentClassName="min-h-0 overflow-hidden"
              footer={
                <Button type="button" variant="ghost" size="sm" className="w-full" render={<Link href="/" />}>
                  Центр управления
                </Button>
              }
            >
              <div className="max-h-[min(52vh,480px)] overflow-y-auto overscroll-y-contain xl:max-h-[min(60vh,560px)]">
                <WorkspaceActivityFeed entries={enrichedEntries} limit={14} />
              </div>
            </EnterprisePanelCard>

            <ActivityLogJournal
              entries={enrichedEntries}
              isLoading={isLoading}
              error={errorMessage}
              className="min-h-[min(72vh,720px)]"
            />
          </div>
        </div>
      </ProFeatureGate>
    </EnterpriseWorkspaceShell>
  );
}
