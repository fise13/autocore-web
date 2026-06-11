"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CategoryGroupHeader,
  CategoryModeToggle,
  PresetChip,
  SelectableTile,
  SetupWizardHeader,
  SetupWizardLayout,
  SetupWizardShell,
  SetupWizardStepPanel,
  SetupWizardSuccess,
} from "@/components/onboarding/setup-wizard-ui";
import {
  CompanyAppConfig,
  CompanyModuleKey,
  CompanySpecificCategoryConfig,
  SETUP_WIZARD_CATEGORY_PRESETS,
  defaultCompanyAppConfig,
} from "@/domain/company-config";
import { WARRANTY_TEMPLATE_IDS } from "@/domain/document-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import {
  SETUP_WIZARD_COPY,
  type BusinessPresetId,
  categoriesForPreset,
  modulesForPreset,
} from "@/lib/onboarding/setup-wizard-copy";
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";
import { readSidebarCustomization, writeSidebarCustomization } from "@/lib/navigation/sidebar-customization";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";

const configRepository = createCompanyConfigRepository();
const specificRepository = createSpecificCategoryRepository();

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
  const [activePreset, setActivePreset] = useState<BusinessPresetId | null>(null);
  const [draft, setDraft] = useState<CompanyAppConfig>(() => defaultCompanyAppConfig());

  const warrantyOptions = useMemo(
    () =>
      WARRANTY_TEMPLATE_IDS.map((id) => {
        const template = getWarrantyTemplate(id);
        return {
          id,
          label: template.name,
          hint:
            id === "custom"
              ? SETUP_WIZARD_COPY.warranty.customHint
              : template.months > 0
                ? `${template.months} мес. · ${template.km.toLocaleString("ru-RU")} км`
                : SETUP_WIZARD_COPY.warranty.noWarranty,
        };
      }),
    [],
  );

  const enabledModulesCount = useMemo(
    () => Object.values(draft.modules).filter(Boolean).length,
    [draft.modules],
  );

  const enabledCategoriesCount = draft.specificCategories.length;

  function goToStep(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  }

  function applyPreset(preset: BusinessPresetId) {
    setActivePreset(preset);
    setDraft((current) => ({
      ...current,
      modules: modulesForPreset(preset),
      specificCategories: categoriesForPreset(preset),
    }));
  }

  function toggleModule(key: CompanyModuleKey, enabled: boolean) {
    setActivePreset(null);
    setDraft((current) => ({
      ...current,
      modules: { ...current.modules, [key]: enabled },
      ...(key === "specifics" && !enabled ? { specificCategories: [] } : {}),
    }));
  }

  function toggleCategory(category: CompanySpecificCategoryConfig, enabled: boolean) {
    setActivePreset(null);
    setDraft((current) => {
      const exists = current.specificCategories.some((item) => item.id === category.id);
      if (enabled && !exists) {
        return {
          ...current,
          specificCategories: [...current.specificCategories, category],
          modules: { ...current.modules, specifics: true },
        };
      }
      if (!enabled && exists) {
        return {
          ...current,
          specificCategories: current.specificCategories.filter((item) => item.id !== category.id),
        };
      }
      return current;
    });
  }

  function setCategoryMode(categoryId: string, mode: "tracked" | "quick") {
    setActivePreset(null);
    setDraft((current) => ({
      ...current,
      specificCategories: current.specificCategories.map((item) =>
        item.id === categoryId ? { ...item, mode } : item,
      ),
    }));
  }

  async function finishSetup() {
    if (!profile?.id) return;
    setBusy(true);
    setError(null);
    try {
      const finalConfig: CompanyAppConfig = {
        ...draft,
        onboardingCompleted: true,
      };
      await configRepository.saveAppConfig(companyId, finalConfig, profile.id);

      const existingCategories = await specificRepository.fetchCategories(companyId);
      for (const category of finalConfig.specificCategories.filter((item) => item.mode === "tracked")) {
        await specificRepository.upsertCategory(companyId, category.name, existingCategories, profile.id);
      }

      const sidebar = applyCompanyModulesToSidebar(readSidebarCustomization(), finalConfig);
      writeSidebarCustomization(sidebar);
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
              setDraft((current) => ({ ...current, specificCategories: [] }));
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
          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{SETUP_WIZARD_COPY.presets.title}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SETUP_WIZARD_COPY.presets.options.map((preset) => (
                    <PresetChip
                      key={preset.id}
                      label={preset.label}
                      description={preset.description}
                      selected={activePreset === preset.id}
                      onClick={() => applyPreset(preset.id)}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{SETUP_WIZARD_COPY.presets.hint}</p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {MODULE_KEYS.map((key, index) => {
                  const meta = SETUP_WIZARD_COPY.modules[key];
                  const Icon = SETUP_WIZARD_COPY.moduleIcons[key];
                  return (
                    <SelectableTile
                      key={key}
                      index={index}
                      selected={draft.modules[key]}
                      onClick={() => toggleModule(key, !draft.modules[key])}
                      title={meta.label}
                      description={meta.description}
                      icon={Icon}
                    />
                  );
                })}
              </div>

              {!canProceedFromStep1 ? (
                <p className="text-sm text-destructive">{SETUP_WIZARD_COPY.validation.pickModule}</p>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-5">
              {!draft.modules.specifics ? (
                <motion.div
                  initial={prefersReducedMotion() ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground"
                >
                  {SETUP_WIZARD_COPY.categories.specificsDisabled}
                </motion.div>
              ) : null}

              {SETUP_WIZARD_COPY.categories.groups.map((group) => {
                const categories = SETUP_WIZARD_CATEGORY_PRESETS.filter((item) =>
                  (group.ids as readonly string[]).includes(item.id),
                );
                const selectedInGroup = categories.filter((item) =>
                  draft.specificCategories.some((selected) => selected.id === item.id),
                ).length;

                return (
                  <div key={group.id} className="flex flex-col gap-2">
                    <CategoryGroupHeader label={group.label} count={selectedInGroup} />
                    <div className="flex flex-col gap-2">
                      {categories.map((category, index) => {
                        const enabled = draft.specificCategories.some((item) => item.id === category.id);
                        const selected = draft.specificCategories.find((item) => item.id === category.id);

                        return (
                          <div key={category.id}>
                            <SelectableTile
                              index={index}
                              selected={enabled}
                              disabled={!draft.modules.specifics}
                              onClick={() => toggleCategory(category, !enabled)}
                              title={category.name}
                              description={
                                enabled && selected
                                  ? selected.mode === "tracked"
                                    ? SETUP_WIZARD_COPY.categories.trackedHint
                                    : SETUP_WIZARD_COPY.categories.quickHint
                                  : SETUP_WIZARD_COPY.categories.emptyHint
                              }
                            />
                            <AnimatePresence initial={false}>
                              {enabled && selected ? (
                                <motion.div
                                  key={`${category.id}-mode`}
                                  initial={prefersReducedMotion() ? false : { opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                >
                                  <CategoryModeToggle
                                    mode={selected.mode}
                                    onChange={(mode) => setCategoryMode(category.id, mode)}
                                  />
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-2">
              {warrantyOptions.map((option, index) => (
                <SelectableTile
                  key={option.id}
                  index={index}
                  selected={draft.defaultWarrantyTemplate === option.id}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      defaultWarrantyTemplate: option.id,
                    }))
                  }
                  title={option.label}
                  description={option.hint}
                  icon={ShieldCheck}
                />
              ))}
            </div>
          ) : null}
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
