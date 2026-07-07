"use client";

import { McEmployeeDashboardGrid } from "@/components/mission-control/employee/mc-employee-dashboard-grid";
import { McDashboardGrid } from "@/components/mission-control/dashboard/mc-dashboard-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useEmployeeMissionControlData } from "@/hooks/use-employee-mission-control-data";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { isEmployeeMissionControlUser } from "@/lib/auth/app-access";
import { normalizeCompanyId } from "@/lib/company-id";

export function MissionControlShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const isEmployeeMc = isEmployeeMissionControlUser(profile);

  const opsData = useMissionControlData({
    profile,
    uid,
    companyId,
    isPro,
    enabled: !isEmployeeMc,
  });
  const employeeData = useEmployeeMissionControlData({
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
