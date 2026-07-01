"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import {
  CategoryGridTile,
  CategoryGroupHeader,
  CategoryModeToggle,
  ModuleSelectRow,
  PresetChip,
  SelectableTile,
  WarrantySelectRow,
} from "@/components/onboarding/setup-wizard-ui";
import {
  CompanyAppConfig,
  CompanyModuleKey,
  CompanySpecificCategoryConfig,
  SpecificCategoryMode,
} from "@/domain/company-config";
import { WARRANTY_TEMPLATE_IDS } from "@/domain/document-config";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import {
  categoriesInGroup,
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
  onToggleCategory: (category: CompanySpecificCategoryConfig, enabled: boolean) => void;
  onSetCategoryMode: (categoryId: string, mode: SpecificCategoryMode) => void;
  onSetDefaultWarrantyTemplate: (template: CompanyAppConfig["defaultWarrantyTemplate"]) => void;
  section: "modules" | "categories" | "warranty";
  showValidation?: boolean;
  compact?: boolean;
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
  compact = false,
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
              : template.days > 0
                ? `${template.days} дн. · ${template.km.toLocaleString("ru-RU")} км`
                : SETUP_WIZARD_COPY.warranty.noWarranty,
        };
      }),
    [],
  );

  const canProceedFromModules = Object.values(draft.modules).filter(Boolean).length > 0;

  if (section === "modules") {
    if (compact) {
      return (
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex flex-wrap gap-2">
            {SETUP_WIZARD_COPY.presets.options.map((preset) => (
              <PresetChip
                key={preset.id}
                label={preset.label}
                selected={activePreset === preset.id}
                onClick={() => onApplyPreset(preset.id)}
                compact
              />
            ))}
          </div>

          <div className="space-y-2">
            {MODULE_KEYS.map((key, index) => {
              const meta = SETUP_WIZARD_COPY.modules[key];
              const Icon = SETUP_WIZARD_COPY.moduleIcons[key];
              return (
                <ModuleSelectRow
                  key={key}
                  index={index}
                  title={meta.label}
                  icon={Icon}
                  selected={draft.modules[key]}
                  onClick={() => onToggleModule(key, !draft.modules[key])}
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

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {SETUP_WIZARD_COPY.presets.title ? (
            <p className="text-xs font-medium text-muted-foreground">{SETUP_WIZARD_COPY.presets.title}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
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
    if (compact) {
      return (
        <div className="mx-auto w-full max-w-2xl space-y-8">
          {!draft.modules.specifics ? (
            <p className="text-sm text-muted-foreground">{SETUP_WIZARD_COPY.categories.specificsDisabled}</p>
          ) : null}

          {SETUP_WIZARD_COPY.categories.groups.map((group) => {
            const categories = categoriesInGroup(group);
            const selectedInGroup = categories.filter((item) =>
              draft.specificCategories.some((selected) => selected.id === item.id),
            ).length;

            return (
              <section key={group.id} className="space-y-3">
                <CategoryGroupHeader label={group.label} count={selectedInGroup} />
                {categories.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {categories.map((category, index) => {
                      const enabled = draft.specificCategories.some((item) => item.id === category.id);
                      const selected = draft.specificCategories.find((item) => item.id === category.id);

                      return (
                        <CategoryGridTile
                          key={category.id}
                          index={index}
                          label={category.name}
                          selected={enabled}
                          mode={selected?.mode ?? category.mode}
                          disabled={!draft.modules.specifics}
                          onToggle={() => onToggleCategory(category, !enabled)}
                          onModeChange={(mode) => onSetCategoryMode(category.id, mode)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                    Масла, антифриз, фильтры, свечи и герметики доступны в разделе «Расходники» после сохранения.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
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
          const categories = categoriesInGroup(group);
          const selectedInGroup = categories.filter((item) =>
            draft.specificCategories.some((selected) => selected.id === item.id),
          ).length;

          return (
            <div key={group.id} className="flex flex-col gap-2">
              <CategoryGroupHeader label={group.label} count={selectedInGroup} />
              {categories.length > 0 ? (
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
                              : SETUP_WIZARD_COPY.categories.emptyHint || undefined
                          }
                        />
                        {enabled && selected ? (
                          <CategoryModeToggle
                            mode={selected.mode}
                            onChange={(mode) => onSetCategoryMode(category.id, mode)}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                  Масла, антифриз, фильтры, свечи и герметики доступны в разделе «Расходники» после сохранения.
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="mx-auto w-full max-w-md space-y-2">
        {warrantyOptions.map((option, index) => (
          <WarrantySelectRow
            key={option.id}
            index={index}
            title={option.label}
            hint={option.hint}
            selected={draft.defaultWarrantyTemplate === option.id}
            onClick={() => onSetDefaultWarrantyTemplate(option.id)}
          />
        ))}
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
        />
      ))}
    </div>
  );
}
