"use client";

import { useMemo, useSyncExternalStore } from "react";

import { isCompleteFullName } from "@/components/auth/profile-name-fields";
import { useAuth } from "@/components/providers/auth-provider";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { can } from "@/lib/auth/permissions";
import { isDemoSession } from "@/lib/demo/demo-config";
import {
  hasEmailVerificationComplete,
  hasWizardCompleted,
} from "@/lib/performance/session-flags";
import { hasCompletedBusinessImport } from "@/lib/onboarding/mark-business-import-completed";

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
  "business-import": "Шаг 5 · Перенос данных",
};

export function useAuthJourneyStep(
  localProfileName?: string | null,
  emailVerifiedHandoff = false,
): AuthJourneyStep {
  const { firebaseUser, profile, isLoading } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const cachedCompleted = useSyncExternalStore(
    () => () => {},
    () => (companyId ? hasWizardCompleted(companyId) : false),
    () => false,
  );
  const migrationOfferCompleted = useSyncExternalStore(
    () => () => {},
    () => (companyId ? hasCompletedBusinessImport(companyId, null) : false),
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
    const emailVerified =
      firebaseUser.emailVerified ||
      emailVerifiedHandoff ||
      hasEmailVerificationComplete(firebaseUser.uid);
    if (provider?.kind === "email" && !emailVerified) {
      return "verify-email";
    }

    const effectiveName = localProfileName ?? profile.displayName ?? null;
    if (!isCompleteFullName(effectiveName)) {
      return "profile-name";
    }

    if (!companyId) {
      return "company";
    }

    const importDone =
      migrationOfferCompleted || hasCompletedBusinessImport(companyId, config);

    if (!loaded) {
      if (companyId && cachedCompleted && importDone) {
        return "app";
      }
      return "loading";
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
      !importDone;

    if (needsBusinessImport) {
      return "business-import";
    }

    return "app";
  }, [
    cachedCompleted,
    companyId,
    config,
    emailVerifiedHandoff,
    firebaseUser,
    isLoading,
    loaded,
    localProfileName,
    migrationOfferCompleted,
    profile,
  ]);
}
