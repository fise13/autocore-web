"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  Loader2,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  CategoryGroupHeader,
  CategoryModeToggle,
  SelectableTile,
  SetupWizardCard,
  SetupWizardHeader,
  SetupWizardShell,
  SetupWizardStepMeta,
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
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";
import { readSidebarCustomization, writeSidebarCustomization } from "@/lib/navigation/sidebar-customization";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";

const configRepository = createCompanyConfigRepository();
const specificRepository = createSpecificCategoryRepository();

const STEPS: SetupWizardStepMeta[] = [
  {
    id: 1,
    title: "Модули",
    subtitle: "Что нужно в ежедневной работе — остальное можно включить позже в настройках.",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "Категории запчастей",
    subtitle: "Полный учёт — таблица и остатки. Только продажа — быстро в заказ-наряд или кассу.",
    icon: Boxes,
  },
  {
    id: 3,
    title: "Гарантия по умолчанию",
    subtitle: "Шаблон для моторов и продаж. На каждой сделке можно изменить.",
    icon: ShieldCheck,
  },
];

const MODULE_META: Record<
  CompanyModuleKey,
  { label: string; description: string; icon: typeof Cog }
> = {
  motors: {
    label: "Моторы и проданные",
    description: "Учёт двигателей, продажи и гарантийные документы",
    icon: Cog,
  },
  workOrders: {
    label: "Заказ-наряды",
    description: "Приём работ, запчасти, зарплата и PDF",
    icon: ClipboardList,
  },
  accounting: {
    label: "Бухгалтерия",
    description: "Операции, счета и отчёты",
    icon: Receipt,
  },
  warehouse: {
    label: "Склад",
    description: "Остатки, перемещения и импорт",
    icon: Warehouse,
  },
  specifics: {
    label: "Специфичные запчасти",
    description: "Коробки, генераторы, кузовные детали",
    icon: Package,
  },
};

const CATEGORY_GROUPS = [
  { id: "mechanics", label: "Агрегаты", ids: ["gearboxes", "transfer_cases", "turbos", "pumps"] },
  { id: "electrical", label: "Электрика", ids: ["ecu", "alternators", "starters"] },
  { id: "body", label: "Кузов", ids: ["bumpers", "headlights", "fenders"] },
] as const;

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
              ? "Настроите условия вручную на каждой сделке"
              : template.months > 0
                ? `${template.months} мес. · ${template.km.toLocaleString("ru-RU")} км`
                : "Без гарантийных обязательств",
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

  function toggleModule(key: CompanyModuleKey, enabled: boolean) {
    setDraft((current) => ({
      ...current,
      modules: { ...current.modules, [key]: enabled },
      ...(key === "specifics" && !enabled ? { specificCategories: [] } : {}),
    }));
  }

  function toggleCategory(category: CompanySpecificCategoryConfig, enabled: boolean) {
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
      setError(e instanceof Error ? e.message : "Не удалось сохранить настройки");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success") {
    return <SetupWizardSuccess onDone={onCompleted} />;
  }

  const canProceedFromStep1 = enabledModulesCount > 0;

  return (
    <SetupWizardShell>
      <SetupWizardHeader steps={STEPS} currentStep={step} />

      <SetupWizardCard>
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {step === 1 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {enabledModulesCount} из {Object.keys(MODULE_META).length} модулей
              </span>
            ) : null}
            {step === 2 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
                <CarFront className="size-3.5 text-primary" aria-hidden />
                {enabledCategoriesCount} категорий выбрано
              </span>
            ) : null}
            {step === 3 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                {getWarrantyTemplate(draft.defaultWarrantyTemplate).name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <SetupWizardStepPanel stepKey={step} direction={direction}>
            {step === 1 ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(Object.keys(MODULE_META) as CompanyModuleKey[]).map((key, index) => {
                  const meta = MODULE_META[key];
                  return (
                    <SelectableTile
                      key={key}
                      index={index}
                      selected={draft.modules[key]}
                      onClick={() => toggleModule(key, !draft.modules[key])}
                      title={meta.label}
                      description={meta.description}
                      icon={meta.icon}
                    />
                  );
                })}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                {!draft.modules.specifics ? (
                  <motion.div
                    initial={prefersReducedMotion() ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                  >
                    Модуль «Специфичные запчасти» выключен на шаге 1. Включите его, если нужны категории
                    ниже.
                  </motion.div>
                ) : null}

                {CATEGORY_GROUPS.map((group) => {
                  const categories = SETUP_WIZARD_CATEGORY_PRESETS.filter((item) =>
                    (group.ids as readonly string[]).includes(item.id),
                  );
                  const selectedInGroup = categories.filter((item) =>
                    draft.specificCategories.some((selected) => selected.id === item.id),
                  ).length;

                  return (
                    <div key={group.id} className="space-y-2">
                      <CategoryGroupHeader label={group.label} count={selectedInGroup} />
                      <div className="space-y-2">
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
                                      ? "Таблица, остатки и полный учёт"
                                      : "Быстрая продажа без склада"
                                    : "Выберите, если работаете с этой категорией"
                                }
                              />
                              <AnimatePresence initial={false}>
                                {enabled && selected ? (
                                  <motion.div
                                    key={`${category.id}-mode`}
                                    initial={prefersReducedMotion() ? false : { opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
              <div className="grid gap-2">
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
                className="animate-shake mt-4 text-sm text-destructive motion-reduce:animate-none"
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 1 || busy}
              onClick={() => goToStep(Math.max(1, step - 1))}
            >
              <ChevronLeft className="size-4" data-icon="inline-start" aria-hidden />
              Назад
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                disabled={busy || (step === 1 && !canProceedFromStep1)}
                onClick={() => goToStep(step + 1)}
              >
                Далее
                <ChevronRight className="size-4" data-icon="inline-end" aria-hidden />
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void finishSetup()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden />
                )}
                {busy ? "Сохраняем…" : "Завершить"}
              </Button>
            )}
          </div>
        </div>
      </SetupWizardCard>
    </SetupWizardShell>
  );
}
