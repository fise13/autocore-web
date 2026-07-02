"use client";

import { ReactNode, useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";

import { EmailVerificationStep } from "@/components/auth/auth-journey-steps/email-verification-step";
import { CompanyOnboardingStep } from "@/components/auth/auth-journey-steps/company-onboarding-step";
import { ProfileNameStep } from "@/components/auth/auth-journey-steps/profile-name-step";
import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import { AuthJourneyShell } from "@/components/auth/auth-journey-shell";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { BusinessImportOnboardingStep } from "@/components/onboarding/business-import-onboarding-step";
import { DomainDictionaryProvider } from "@/components/domain/domain-dictionary-provider";
import {
  AUTH_JOURNEY_STEP_LABELS,
  useAuthJourneyStep,
} from "@/hooks/use-auth-journey-step";
import { markWizardCompleted, hasEmailVerificationComplete } from "@/lib/performance/session-flags";
import { SETUP_WIZARD_COPY } from "@/lib/onboarding/setup-wizard-copy";
import { userCopy } from "@/lib/user-copy";
import { useAuth } from "@/components/providers/auth-provider";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { resetDissolveVeil } from "@/lib/motion/dissolve-transition";

type AuthJourneyCoordinatorProps = {
  children: ReactNode;
};

export function AuthJourneyCoordinator({ children }: AuthJourneyCoordinatorProps) {
  const { profile, firebaseUser } = useAuth();
  const [savedProfileName, setSavedProfileName] = useState<string | null>(null);
  const [emailVerifiedHandoff, setEmailVerifiedHandoff] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [pendingBusinessImport, setPendingBusinessImport] = useState(false);
  const step = useAuthJourneyStep(savedProfileName, emailVerifiedHandoff);
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    if (hasEmailVerificationComplete(uid)) {
      setEmailVerifiedHandoff(true);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (config?.onboardingCompleted && companyId) {
      markWizardCompleted(companyId);
    }
  }, [config?.onboardingCompleted, companyId]);

  useEffect(() => {
    if (importDone || step === "app") {
      resetDissolveVeil();
    }
  }, [importDone, step]);

  if (importDone || step === "app") {
    return <>{children}</>;
  }

  if ((step === "business-import" || pendingBusinessImport) && companyId && !importDone) {
    return (
      <DomainDictionaryProvider>
        <BusinessImportOnboardingStep
          companyId={companyId}
          onDone={() => {
            setImportDone(true);
            setPendingBusinessImport(false);
          }}
        />
      </DomainDictionaryProvider>
    );
  }

  const resolvedStep = step === "loading" ? "boot" : step;
  const stepLabel =
    step === "loading"
      ? "Подготовка пространства"
      : AUTH_JOURNEY_STEP_LABELS[step];
  const contentWidth =
    step === "setup-wizard" ? "xl" : step === "company" ? "md" : "md";

  return (
    <AuthJourneyShell
      stepKey={resolvedStep}
      stepLabel={stepLabel}
      contentWidth={contentWidth}
      layout="center"
    >
      {step === "loading" ? <AuthJourneyBootStep /> : null}
      {step === "verify-email" ? (
        <EmailVerificationStep onVerified={() => setEmailVerifiedHandoff(true)} />
      ) : null}
      {step === "profile-name" ? <ProfileNameStep onSaved={setSavedProfileName} /> : null}
      {step === "company" ? <CompanyOnboardingStep /> : null}
      {step === "setup-wizard" ? (
        <SetupWizardJourneyStep
          companyId={companyId}
          loaded={loaded}
          onCompleted={() => {
            if (companyId) markWizardCompleted(companyId);
            setPendingBusinessImport(true);
          }}
        />
      ) : null}
    </AuthJourneyShell>
  );
}

function AuthJourneyBootStep() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <AuthJourneyReveal index={0}>
        <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      </AuthJourneyReveal>
      <AuthJourneyReveal index={1}>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{userCopy.auth.completing}</p>
          <p className="text-xs text-muted-foreground">Секунду…</p>
        </div>
      </AuthJourneyReveal>
    </div>
  );
}

function SetupWizardJourneyStep({
  companyId,
  loaded,
  onCompleted,
}: {
  companyId: string | null;
  loaded: boolean;
  onCompleted: () => void;
}) {
  if (!companyId || !loaded) {
    return <SetupWizardLoadingCard />;
  }

  return (
    <SetupWizard
      embedded
      companyId={companyId}
      onCompleted={() => {
        markWizardCompleted(companyId);
        onCompleted();
      }}
    />
  );
}

function SetupWizardLoadingCard() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <AuthJourneyReveal index={0}>
        <span className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
          <Settings2 className="size-5" aria-hidden />
        </span>
      </AuthJourneyReveal>
      <AuthJourneyReveal index={1}>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{SETUP_WIZARD_COPY.shell.loadingTitle}</p>
          <p className="text-xs text-muted-foreground">{SETUP_WIZARD_COPY.shell.loadingSubtitle}</p>
        </div>
      </AuthJourneyReveal>
      <AuthJourneyReveal index={2}>
        <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
      </AuthJourneyReveal>
    </div>
  );
}
