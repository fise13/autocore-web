"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { isDemoSession } from "@/lib/demo/demo-config";

export function useDemoSession(): boolean {
  const { firebaseUser, profile } = useAuth();

  return useMemo(() => {
    if (!firebaseUser) return false;
    return isDemoSession({
      email: firebaseUser.email,
      companyId: profile?.companyId ?? null,
    });
  }, [firebaseUser, profile?.companyId]);
}
