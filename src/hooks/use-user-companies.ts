"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import {
  recordUserCompanyMembership,
  subscribeUserCompanyMemberships,
  type UserCompanyMembership,
} from "@/infrastructure/firestore/user-company-membership-service";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";

export function useUserCompanies() {
  const { profile } = useAuth();
  const userId = profile?.id ?? "";
  const activeCompanyId = normalizeCompanyId(profile?.companyId);
  const { name: activeCompanyName } = useCompanyProfile(activeCompanyId);
  const [memberships, setMemberships] = useState<UserCompanyMembership[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedCompany = useMemo<UserCompanyMembership | null>(() => {
    if (!activeCompanyId) return null;
    return {
      companyId: activeCompanyId,
      role: profile?.role ?? "employee",
      name: activeCompanyName?.trim() || userCopy.defaultCompanyName,
    };
  }, [activeCompanyId, activeCompanyName, profile?.role]);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    return subscribeUserCompanyMemberships(
      userId,
      (next) => {
        setMemberships(next);
        setIsSyncing(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsSyncing(false);
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeCompanyId || !profile?.role) return;
    void recordUserCompanyMembership(
      userId,
      activeCompanyId,
      profile.role,
      activeCompanyName ?? undefined,
    ).catch(() => undefined);
  }, [activeCompanyId, activeCompanyName, profile?.role, userId]);

  const companies = useMemo(() => {
    if (memberships.length > 0) return memberships;
    return seedCompany ? [seedCompany] : [];
  }, [memberships, seedCompany]);

  return {
    companies,
    activeCompanyId,
    isLoading: isSyncing && companies.length === 0,
    isSyncing,
    error,
  };
}
