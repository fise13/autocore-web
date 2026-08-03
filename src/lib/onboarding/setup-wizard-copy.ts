import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  Cog,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";

import type {
  CompanyModuleKey,
  CompanySpecificCategoryConfig,
  SpecificCategoryMode,
} from "@/domain/company-config";
import { SETUP_WIZARD_CATEGORY_PRESETS } from "@/domain/company-config";
import type { InventoryGroupId } from "@/domain/inventory-taxonomy";
import { userCopy } from "@/lib/user-copy";

export type SetupWizardCategoryId =
  | "gearboxes"
  | "transfer_cases"
  | "turbos"
  | "reducers"
  | "body"
  | "optics"
  | "interior"
  | "suspension"
  | "electrical";

export type SetupWizardCategoryGroupId = InventoryGroupId;

export type SetupWizardCategoryGroup = {
  id: SetupWizardCategoryGroupId;
  label: string;
  ids: readonly SetupWizardCategoryId[];
};

function setupCopy() {
  return userCopy.onboarding.setupWizard;
}

export function getSetupWizardCategoryGroups(): readonly SetupWizardCategoryGroup[] {
  const labels = setupCopy().categories;
  return [
    { id: "aggregates", label: labels.aggregates, ids: ["gearboxes", "turbos", "reducers", "transfer_cases"] },
    { id: "parts", label: labels.parts, ids: ["body", "optics", "interior", "suspension", "electrical"] },
    { id: "consumables", label: labels.consumables, ids: [] },
  ] as const;
}

/** Structural category groups (labels via getSetupWizardCategoryGroups / SETUP_WIZARD_COPY.categories.groups). */
export const SETUP_WIZARD_CATEGORY_GROUPS = [
  { id: "aggregates", label: "Aggregates", ids: ["gearboxes", "turbos", "reducers", "transfer_cases"] },
  { id: "parts", label: "Parts", ids: ["body", "optics", "interior", "suspension", "electrical"] },
  { id: "consumables", label: "Consumables", ids: [] },
] as const satisfies readonly SetupWizardCategoryGroup[];

export function getSetupWizardCategoryPresets(): CompanySpecificCategoryConfig[] {
  const names = setupCopy().categories.names;
  return SETUP_WIZARD_CATEGORY_PRESETS.map((item) => ({
    ...item,
    name: names[item.id as SetupWizardCategoryId] ?? item.name,
  }));
}

export function categoriesInGroup(group: SetupWizardCategoryGroup): CompanySpecificCategoryConfig[] {
  const ids = new Set<string>(group.ids);
  return getSetupWizardCategoryPresets().filter((item) => ids.has(item.id));
}

export type SetupWizardCategoryPreset = Pick<
  CompanySpecificCategoryConfig,
  "id" | "name" | "mode" | "warrantyDefault"
>;

export type SetupWizardStepId = 1 | 2 | 3;

export type SetupWizardStepMeta = {
  id: SetupWizardStepId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const MODULE_ICONS = {
  motors: Cog,
  workOrders: ClipboardList,
  accounting: Receipt,
  warehouse: Warehouse,
  specifics: Package,
} as const satisfies Record<CompanyModuleKey, LucideIcon>;

const STEP_ICONS = [Sparkles, Boxes, ShieldCheck] as const;

/**
 * Locale-aware setup wizard copy. Property access reads the active userCopy locale.
 */
export const SETUP_WIZARD_COPY = {
  get shell() {
    return setupCopy().shell;
  },
  get steps(): SetupWizardStepMeta[] {
    const steps = setupCopy().steps;
    return [
      { id: 1, title: steps.sections.title, subtitle: steps.sections.subtitle, icon: STEP_ICONS[0] },
      { id: 2, title: steps.catalog.title, subtitle: steps.catalog.subtitle, icon: STEP_ICONS[1] },
      { id: 3, title: steps.warranty.title, subtitle: steps.warranty.subtitle, icon: STEP_ICONS[2] },
    ];
  },
  get presets() {
    const presets = setupCopy().presets;
    return {
      title: presets.title,
      hint: "",
      options: [
        { id: "service" as const, label: presets.service.label, description: presets.service.description },
        {
          id: "dismantling" as const,
          label: presets.dismantling.label,
          description: presets.dismantling.description,
        },
        { id: "full" as const, label: presets.full.label, description: presets.full.description },
      ],
    };
  },
  get modules() {
    return setupCopy().modules;
  },
  moduleIcons: MODULE_ICONS,
  get categories() {
    const categories = setupCopy().categories;
    return {
      specificsDisabled: categories.specificsDisabled,
      emptyHint: "",
      trackedHint: categories.trackedHint,
      quickHint: categories.quickHint,
      modeTracked: categories.modeTracked,
      modeQuick: categories.modeQuick,
      modeTrackedAria: categories.modeTrackedAria,
      modeQuickAria: categories.modeQuickAria,
      groups: getSetupWizardCategoryGroups(),
    };
  },
  get warranty() {
    return setupCopy().warranty;
  },
  get actions() {
    const actions = setupCopy().actions;
    return {
      ...actions,
      stepCounter: (current: number, total: number) => `${current} / ${total}`,
      modulesSelected: (count: number, total: number) => `${count}/${total}`,
      categoriesSelected: (count: number) => (count === 0 ? "0" : String(count)),
    };
  },
  get validation() {
    return setupCopy().validation;
  },
  get success() {
    return setupCopy().success;
  },
  get settings() {
    return setupCopy().settings;
  },
};

export type BusinessPresetId = (typeof SETUP_WIZARD_COPY.presets.options)[number]["id"];

export function modulesForPreset(preset: BusinessPresetId): Record<CompanyModuleKey, boolean> {
  switch (preset) {
    case "service":
      return {
        motors: false,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      };
    case "dismantling":
      return {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      };
    case "full":
    default:
      return {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      };
  }
}

export function categoriesForPreset(preset: BusinessPresetId): CompanySpecificCategoryConfig[] {
  const byId = (ids: readonly SetupWizardCategoryId[]) =>
    getSetupWizardCategoryPresets().filter((item) =>
      (ids as readonly string[]).includes(item.id),
    );

  switch (preset) {
    case "service":
      return [];
    case "dismantling":
      return byId(["gearboxes", "transfer_cases", "turbos", "body", "optics"]);
    case "full":
    default:
      return byId(["gearboxes", "transfer_cases", "turbos", "reducers", "body", "optics", "electrical"]);
  }
}
