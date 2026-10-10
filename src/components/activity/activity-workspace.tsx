"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ActivityLogJournal } from "@/components/activity/activity-log-journal";
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
  Activity,
  LayoutGrid,
  Shield,
  Users,
} from "lucide-react";
import { formatEventCountLabel } from "@/lib/activity/activity-journal-utils";
import { enrichActivityLogs } from "@/lib/overview/enrich-activity-logs";
import { canViewEmployees } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";

const ACTIVITY_NAV = [
  { id: "overview", label: userCopy.activity.navOnShift, icon: LayoutGrid, href: "/team" },
  { id: "employees", label: userCopy.settings.employees, icon: Users, href: "/team?tab=employees" },
  { id: "roles", label: userCopy.settings.roles, icon: Shield, href: "/team?tab=roles" },
  { id: "activity", label: userCopy.activity.navActivity, icon: Activity },
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
      <EnterpriseWorkspaceShell title={userCopy.activity.title} description={userCopy.activity.description}>
        <EnterprisePanelCard
          title={userCopy.activity.proRightsTitle}
          contentClassName="px-6 py-10 text-center text-sm text-muted-foreground"
        >
          {userCopy.activity.proRightsDescription}
        </EnterprisePanelCard>
      </EnterpriseWorkspaceShell>
    );
  }

  return (
    <EnterpriseWorkspaceShell
      title={userCopy.activity.title}
      description={userCopy.activity.shellDescription}
      meta={
        <Badge variant="secondary">{userCopy.activity.inJournal(formatEventCountLabel(enrichedEntries.length))}</Badge>
      }
      action={
        <Button type="button" variant="outline" render={<Link href="/team" />}>
          {userCopy.activity.toTeam}
        </Button>
      }
    >
      <ProFeatureGate
        feature="invite"
        title={userCopy.activity.proTitle}
        description={userCopy.activity.proDescription}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <EnterpriseWorkspaceNav
            layoutId="team-workspace-nav"
            items={[...ACTIVITY_NAV]}
            activeId="activity"
            onSelect={() => undefined}
          />

          <ActivityLogJournal
            entries={enrichedEntries}
            isLoading={isLoading}
            error={errorMessage}
            className="min-h-[min(78vh,780px)]"
          />
        </div>
      </ProFeatureGate>
    </EnterpriseWorkspaceShell>
  );
}
