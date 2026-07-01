"use client";

import { useMemo, useSyncExternalStore } from "react";

import { isCompleteFullName } from "@/components/auth/profile-name-fields";
import { useAuth } from "@/components/providers/auth-provider";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { can } from "@/lib/auth/permissions";
import { isDemoSession } from "@/lib/demo/demo-config";
import { hasMigrationOfferCompleted, hasWizardCompleted } from "@/lib/performance/session-flags";

export type AuthJourneyStep =
  | "loading"
  | "verify-email"
  | "profile-name"
  | "company"
  | "setup-wizard"
  | "business-import"
  | "app";

export type AuthJourneyStepMeta = {
  key: AuthJourneyStep;
  label: string;
};

export const AUTH_JOURNEY_STEP_LABELS: Record<Exclude<AuthJourneyStep, "loading" | "app">, string> = {
  "verify-email": "Подтверждение email",
  "profile-name": "Ваш профиль",
  company: "Команда и доступ",
  "setup-wizard": "Настройка пространства",
  "business-import": "Перенос данных",
};

export function useAuthJourneyStep(localProfileName?: string | null): AuthJourneyStep {
  const { firebaseUser, profile, isLoading } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const cachedCompleted = useSyncExternalStore(
    () => () => {},
    () => (companyId ? hasWizardCompleted(companyId) : false),
    () => false,
  );

  return useMemo(() => {
    if (isLoading || !profile || !firebaseUser) return "loading";

    if (
      isDemoSession({
        email: firebaseUser.email,
        companyId: profile.companyId ?? null,
      })
    ) {
      return "app";
    }

    const provider = getAccountProviderInfo(firebaseUser);
    if (provider?.kind === "email" && !firebaseUser.emailVerified) {
      return "verify-email";
    }

    const effectiveName = localProfileName ?? profile.displayName ?? null;
    if (!isCompleteFullName(effectiveName)) {
      return "profile-name";
    }

    if (!companyId) {
      return "company";
    }

    if (!loaded) {
      if (
        cachedCompleted &&
        profile.isCompanyOwner &&
        companyId &&
        !hasMigrationOfferCompleted(companyId)
      ) {
        return "business-import";
      }
      return cachedCompleted ? "app" : "loading";
    }

    const needsWizard =
      !cachedCompleted &&
      !config?.onboardingCompleted &&
      (profile.isCompanyOwner || can(profile, "settings_manage"));

    if (needsWizard) {
      return "setup-wizard";
    }

    const needsBusinessImport =
      profile.isCompanyOwner &&
      config?.onboardingCompleted &&
      !hasMigrationOfferCompleted(companyId);

    if (needsBusinessImport) {
      return "business-import";
    }

    return "app";
  }, [
    cachedCompleted,
    companyId,
    config?.onboardingCompleted,
    firebaseUser,
    isLoading,
    loaded,
    localProfileName,
    profile,
  ]);
}
