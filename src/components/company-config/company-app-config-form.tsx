"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

import {
  CategoryGroupHeader,
  CategoryModeToggle,
  PresetChip,
  SelectableTile,
} from "@/components/onboarding/setup-wizard-ui";
import {
  CompanyAppConfig,
  CompanyModuleKey,
  SETUP_WIZARD_CATEGORY_PRESETS,
} from "@/domain/company-config";
import { WARRANTY_TEMPLATE_IDS } from "@/domain/document-config";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import {
  SETUP_WIZARD_COPY,
  type BusinessPresetId,
} from "@/lib/onboarding/setup-wizard-copy";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";

const MODULE_KEYS = Object.keys(SETUP_WIZARD_COPY.modules) as CompanyModuleKey[];

type CompanyAppConfigFormProps = {
  draft: CompanyAppConfig;
  activePreset: BusinessPresetId | null;
  onApplyPreset: (preset: BusinessPresetId) => void;
  onToggleModule: (key: CompanyModuleKey, enabled: boolean) => void;
  onToggleCategory: (category: (typeof SETUP_WIZARD_CATEGORY_PRESETS)[number], enabled: boolean) => void;
  onSetCategoryMode: (categoryId: string, mode: "tracked" | "quick") => void;
  onSetDefaultWarrantyTemplate: (template: CompanyAppConfig["defaultWarrantyTemplate"]) => void;
  section: "modules" | "categories" | "warranty";
  showValidation?: boolean;
};

export function CompanyAppConfigForm({
  draft,
  activePreset,
  onApplyPreset,
  onToggleModule,
  onToggleCategory,
  onSetCategoryMode,
  onSetDefaultWarrantyTemplate,
  section,
  showValidation = false,
}: CompanyAppConfigFormProps) {
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

  const canProceedFromModules = Object.values(draft.modules).filter(Boolean).length > 0;

  if (section === "modules") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">{SETUP_WIZARD_COPY.presets.title}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SETUP_WIZARD_COPY.presets.options.map((preset) => (
              <PresetChip
                key={preset.id}
                label={preset.label}
                description={preset.description}
                selected={activePreset === preset.id}
                onClick={() => onApplyPreset(preset.id)}
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
                onClick={() => onToggleModule(key, !draft.modules[key])}
                title={meta.label}
                description={meta.description}
                icon={Icon}
              />
            );
          })}
        </div>

        {showValidation && !canProceedFromModules ? (
          <p className="text-sm text-destructive">{SETUP_WIZARD_COPY.validation.pickModule}</p>
        ) : null}
      </div>
    );
  }

  if (section === "categories") {
    return (
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
                        onClick={() => onToggleCategory(category, !enabled)}
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
                              onChange={(mode) => onSetCategoryMode(category.id, mode)}
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
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {warrantyOptions.map((option, index) => (
        <SelectableTile
          key={option.id}
          index={index}
          selected={draft.defaultWarrantyTemplate === option.id}
          onClick={() => onSetDefaultWarrantyTemplate(option.id)}
          title={option.label}
          description={option.hint}
          icon={ShieldCheck}
        />
      ))}
    </div>
  );
}
