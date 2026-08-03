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

import { userCopy } from "@/lib/user-copy";

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
  get "verify-email"() {
    return userCopy.auth.journeySteps.verifyEmail;
  },
  get "profile-name"() {
    return userCopy.auth.journeySteps.profileName;
  },
  get company() {
    return userCopy.auth.journeySteps.company;
  },
  get "setup-wizard"() {
    return userCopy.auth.journeySteps.setupWizard;
  },
  get "business-import"() {
    return userCopy.auth.journeySteps.businessImport;
  },
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

    if (!loaded) {
      if (companyId && (cachedCompleted || config?.onboardingCompleted)) {
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
    profile,
  ]);
}
