"use client";

import { McEmployeeDashboardGrid } from "@/components/overview/employee/mc-employee-dashboard-grid";
import { McDashboardGrid } from "@/components/overview/dashboard/mc-dashboard-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useEmployeeOverviewData } from "@/hooks/use-employee-overview-data";
import { useOverviewData } from "@/hooks/use-overview-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { isEmployeeOverviewUser } from "@/lib/auth/app-access";
import { normalizeCompanyId } from "@/lib/company-id";

export function OverviewShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const isEmployeeMc = isEmployeeOverviewUser(profile);

  const opsData = useOverviewData({
    profile,
    uid,
    companyId,
    isPro,
    enabled: !isEmployeeMc,
  });
  const employeeData = useEmployeeOverviewData({
    profile,
    uid,
    companyId,
    enabled: isEmployeeMc,
  });

  usePresenceHeartbeat(companyId, uid, Boolean(profile?.companyId));

  if (isEmployeeMc && profile) {
    return <McEmployeeDashboardGrid {...employeeData} profile={profile} />;
  }

  return <McDashboardGrid {...opsData} />;
}
