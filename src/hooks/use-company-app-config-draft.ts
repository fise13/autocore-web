"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CompanyAppConfig,
  CompanyModuleKey,
  CompanySpecificCategoryConfig,
  defaultCompanyAppConfig,
} from "@/domain/company-config";
import {
  type BusinessPresetId,
  categoriesForPreset,
  modulesForPreset,
} from "@/lib/onboarding/setup-wizard-copy";

export function useCompanyAppConfigDraft(initialConfig?: CompanyAppConfig | null) {
  const [draft, setDraft] = useState<CompanyAppConfig>(() => initialConfig ?? defaultCompanyAppConfig());
  const [activePreset, setActivePreset] = useState<BusinessPresetId | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setDraft(initialConfig);
      setActivePreset(null);
    }
  }, [initialConfig]);

  const enabledModulesCount = useMemo(
    () => Object.values(draft.modules).filter(Boolean).length,
    [draft.modules],
  );

  const enabledCategoriesCount = draft.specificCategories.length;

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

  function clearCategories() {
    setActivePreset(null);
    setDraft((current) => ({ ...current, specificCategories: [] }));
  }

  function setDefaultWarrantyTemplate(template: CompanyAppConfig["defaultWarrantyTemplate"]) {
    setDraft((current) => ({ ...current, defaultWarrantyTemplate: template }));
  }

  return {
    draft,
    setDraft,
    activePreset,
    enabledModulesCount,
    enabledCategoriesCount,
    applyPreset,
    toggleModule,
    toggleCategory,
    setCategoryMode,
    clearCategories,
    setDefaultWarrantyTemplate,
  };
}
