"use client";

import { McDashboardGrid } from "@/components/mission-control/dashboard/mc-dashboard-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { normalizeCompanyId } from "@/lib/company-id";

export function MissionControlShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";

  const data = useMissionControlData({ profile, uid, companyId, isPro });
  usePresenceHeartbeat(companyId, uid, Boolean(profile?.companyId));

  return <McDashboardGrid {...data} />;
}
