"use client";

import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Loader2, Settings2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { DashboardShellSkeleton } from "@/components/layout/dashboard-shell-skeleton";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { can } from "@/lib/auth/permissions";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { SETUP_WIZARD_COPY } from "@/lib/onboarding/setup-wizard-copy";
import {
  hasWizardCompleted,
  markWizardCompleted,
} from "@/lib/performance/session-flags";

type SetupWizardGateProps = {
  children: ReactNode;
};

function useWizardCompletedFlag(companyId: string | null): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => (companyId ? hasWizardCompleted(companyId) : false),
    () => false,
  );
}

export function SetupWizardGate({ children }: SetupWizardGateProps) {
  const { profile, isLoading } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const [localCompleted, setLocalCompleted] = useState(false);
  const cachedCompleted = useWizardCompletedFlag(companyId);

  useEffect(() => {
    if (config?.onboardingCompleted && companyId) {
      markWizardCompleted(companyId);
    }
  }, [config?.onboardingCompleted, companyId]);

  if (isLoading || !profile) {
    return <DashboardShellSkeleton />;
  }

  if (!companyId) {
    return <>{children}</>;
  }

  if (!loaded && cachedCompleted) {
    return <>{children}</>;
  }

  if (!loaded) {
    return <SetupWizardLoadingState />;
  }

  const needsWizard =
    !localCompleted &&
    !cachedCompleted &&
    !config?.onboardingCompleted &&
    (profile.isCompanyOwner || can(profile, "settings_manage"));

  if (needsWizard) {
    return (
      <SetupWizard
        companyId={companyId}
        onCompleted={() => {
          markWizardCompleted(companyId);
          setLocalCompleted(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

function SetupWizardLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        className="flex flex-col items-center gap-4 text-center"
        initial={prefersReducedMotion() ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
          <Settings2 className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{SETUP_WIZARD_COPY.shell.loadingTitle}</p>
          <p className="text-xs text-muted-foreground">{SETUP_WIZARD_COPY.shell.loadingSubtitle}</p>
        </div>
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      </motion.div>
    </div>
  );
}
