"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { normalizeCompanyId } from "@/lib/company-id";

export function PresenceHeartbeatHead() {
  const { profile, firebaseUser } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = firebaseUser?.uid ?? "";

  usePresenceHeartbeat(companyId, uid, Boolean(companyId && uid));

  return null;
}
