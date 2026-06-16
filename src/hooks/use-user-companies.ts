"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
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
  const [memberships, setMemberships] = useState<UserCompanyMembership[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return subscribeUserCompanyMemberships(
      userId,
      (next) => {
        setMemberships(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeCompanyId || !profile?.role) return;
    void recordUserCompanyMembership(userId, activeCompanyId, profile.role).catch(() => undefined);
  }, [activeCompanyId, profile?.role, userId]);

  const companies = useMemo(() => {
    if (memberships.length > 0) return memberships;
    if (!activeCompanyId) return [];
    return [
      {
        companyId: activeCompanyId,
        role: profile?.role ?? "employee",
        name: userCopy.defaultCompanyName,
      },
    ] satisfies UserCompanyMembership[];
  }, [activeCompanyId, memberships, profile?.role]);

  return {
    companies,
    activeCompanyId,
    isLoading,
    error,
  };
}
