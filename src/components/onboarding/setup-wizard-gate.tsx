"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Settings2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { can } from "@/lib/auth/permissions";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { userCopy } from "@/lib/user-copy";

type SetupWizardGateProps = {
  children: ReactNode;
};

export function SetupWizardGate({ children }: SetupWizardGateProps) {
  const { profile, isLoading } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const [localCompleted, setLocalCompleted] = useState(false);

  if (isLoading || !profile) {
    return <AppLoadingScreen message={userCopy.auth.loading} />;
  }

  if (!companyId) {
    return <>{children}</>;
  }

  if (!loaded) {
    return <SetupWizardLoadingState />;
  }

  const needsWizard =
    !localCompleted && !config?.onboardingCompleted && (profile.isCompanyOwner || can(profile, "settings_manage"));

  if (needsWizard) {
    return (
      <SetupWizard
        companyId={companyId}
        onCompleted={() => setLocalCompleted(true)}
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
          <p className="text-sm font-medium text-foreground">Подготавливаем мастер настройки</p>
          <p className="text-xs text-muted-foreground">Загружаем конфигурацию компании…</p>
        </div>
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      </motion.div>
    </div>
  );
}
