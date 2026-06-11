"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { CompanyAppConfigForm } from "@/components/company-config/company-app-config-form";
import {
  SetupWizardHeader,
  SetupWizardLayout,
  SetupWizardShell,
  SetupWizardStepPanel,
  SetupWizardSuccess,
} from "@/components/onboarding/setup-wizard-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyModuleKey } from "@/domain/company-config";
import { useCompanyAppConfigDraft } from "@/hooks/use-company-app-config-draft";
import { saveCompanyAppConfig } from "@/lib/onboarding/save-company-app-config";
import { SETUP_WIZARD_COPY } from "@/lib/onboarding/setup-wizard-copy";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";

const STEPS = SETUP_WIZARD_COPY.steps;
const MODULE_KEYS = Object.keys(SETUP_WIZARD_COPY.modules) as CompanyModuleKey[];

type SetupWizardProps = {
  companyId: string;
  onCompleted: () => void;
};

type WizardPhase = "wizard" | "success";

export function SetupWizard({ companyId, onCompleted }: SetupWizardProps) {
  const { profile } = useAuth();
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    draft,
    activePreset,
    enabledModulesCount,
    enabledCategoriesCount,
    applyPreset,
    toggleModule,
    toggleCategory,
    setCategoryMode,
    clearCategories,
    setDefaultWarrantyTemplate,
  } = useCompanyAppConfigDraft();

  function goToStep(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  }

  async function finishSetup() {
    if (!profile?.id) return;
    setBusy(true);
    setError(null);
    try {
      await saveCompanyAppConfig({
        companyId,
        config: draft,
        userId: profile.id,
        markOnboardingCompleted: true,
      });
      setPhase("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : SETUP_WIZARD_COPY.validation.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success") {
    return <SetupWizardSuccess onDone={onCompleted} />;
  }

  const canProceedFromStep1 = enabledModulesCount > 0;

  const statusBadge =
    step === 1 ? (
      <Badge variant="outline">
        {SETUP_WIZARD_COPY.actions.modulesSelected(enabledModulesCount, MODULE_KEYS.length)}
      </Badge>
    ) : step === 2 ? (
      <Badge variant="outline">{SETUP_WIZARD_COPY.actions.categoriesSelected(enabledCategoriesCount)}</Badge>
    ) : (
      <Badge variant="outline">{getWarrantyTemplate(draft.defaultWarrantyTemplate).name}</Badge>
    );

  const section = step === 1 ? "modules" : step === 2 ? "categories" : "warranty";

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        disabled={step === 1 || busy}
        onClick={() => goToStep(Math.max(1, step - 1))}
      >
        <ChevronLeft data-icon="inline-start" aria-hidden />
        {SETUP_WIZARD_COPY.actions.back}
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        {step === 2 ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              clearCategories();
              goToStep(3);
            }}
          >
            {SETUP_WIZARD_COPY.actions.skipCategories}
          </Button>
        ) : null}

        {step < 3 ? (
          <Button
            type="button"
            disabled={busy || (step === 1 && !canProceedFromStep1)}
            onClick={() => goToStep(step + 1)}
          >
            {SETUP_WIZARD_COPY.actions.next}
            <ChevronRight data-icon="inline-end" aria-hidden />
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => void finishSetup()}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 aria-hidden />
            )}
            {busy ? SETUP_WIZARD_COPY.actions.saving : SETUP_WIZARD_COPY.actions.finish}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <SetupWizardShell>
      <SetupWizardHeader steps={STEPS} currentStep={step} />

      <SetupWizardLayout steps={STEPS} currentStep={step} footer={footer} status={statusBadge}>
        <SetupWizardStepPanel stepKey={step} direction={direction}>
          <CompanyAppConfigForm
            draft={draft}
            activePreset={activePreset}
            onApplyPreset={applyPreset}
            onToggleModule={toggleModule}
            onToggleCategory={toggleCategory}
            onSetCategoryMode={setCategoryMode}
            onSetDefaultWarrantyTemplate={setDefaultWarrantyTemplate}
            section={section}
            showValidation={step === 1}
          />
        </SetupWizardStepPanel>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              role="alert"
              initial={prefersReducedMotion() ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-sm text-destructive"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </SetupWizardLayout>
    </SetupWizardShell>
  );
}
