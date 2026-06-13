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

export type SetupWizardCategoryId =
  | "gearboxes"
  | "transfer_cases"
  | "turbos"
  | "pumps"
  | "ecu"
  | "alternators"
  | "starters"
  | "bumpers"
  | "headlights"
  | "fenders";

export type SetupWizardCategoryGroupId = "mechanics" | "electrical" | "body";

export type SetupWizardCategoryGroup = {
  id: SetupWizardCategoryGroupId;
  label: string;
  ids: readonly SetupWizardCategoryId[];
};

export const SETUP_WIZARD_CATEGORY_GROUPS = [
  { id: "mechanics", label: "Агрегаты", ids: ["gearboxes", "transfer_cases", "turbos", "pumps"] },
  { id: "electrical", label: "Электрика", ids: ["ecu", "alternators", "starters"] },
  { id: "body", label: "Кузов", ids: ["bumpers", "headlights", "fenders"] },
] as const satisfies readonly SetupWizardCategoryGroup[];

export function categoriesInGroup(group: SetupWizardCategoryGroup): CompanySpecificCategoryConfig[] {
  const ids = new Set<string>(group.ids);
  return SETUP_WIZARD_CATEGORY_PRESETS.filter((item) => ids.has(item.id));
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

export const SETUP_WIZARD_COPY = {
  shell: {
    title: "Настройка",
    subtitle: "Можно изменить позже в настройках.",
    loadingTitle: "Загружаем настройки",
    loadingSubtitle: "Секунду…",
  },
  steps: [
    {
      id: 1,
      title: "Разделы",
      subtitle: "Что показывать в меню",
      icon: Sparkles,
    },
    {
      id: 2,
      title: "Каталог",
      subtitle: "Типы запчастей",
      icon: Boxes,
    },
    {
      id: 3,
      title: "Гарантия",
      subtitle: "Шаблон по умолчанию",
      icon: ShieldCheck,
    },
  ] satisfies SetupWizardStepMeta[],
  presets: {
    title: "Шаблон",
    hint: "",
    options: [
      {
        id: "service",
        label: "СТО",
        description: "Наряды · склад",
      },
      {
        id: "dismantling",
        label: "Разбор",
        description: "Моторы · продажи",
      },
      {
        id: "full",
        label: "Всё",
        description: "Полный цикл",
      },
    ] as const,
  },
  modules: {
    motors: {
      label: "Моторы",
      description: "Продажи и гарантия",
    },
    workOrders: {
      label: "Заказ-наряды",
      description: "Приём и цех",
    },
    accounting: {
      label: "Бухгалтерия",
      description: "Операции и счета",
    },
    warehouse: {
      label: "Склад",
      description: "Остатки",
    },
    specifics: {
      label: "Каталог",
      description: "Запчасти",
    },
  } satisfies Record<CompanyModuleKey, { label: string; description: string }>,
  moduleIcons: {
    motors: Cog,
    workOrders: ClipboardList,
    accounting: Receipt,
    warehouse: Warehouse,
    specifics: Package,
  } satisfies Record<CompanyModuleKey, LucideIcon>,
  categories: {
    specificsDisabled: "Включите «Каталог» на шаге 1 или пропустите.",
    emptyHint: "",
    trackedHint: "Склад",
    quickHint: "Без склада",
    modeTracked: "Склад",
    modeQuick: "Быстро",
    modeTrackedAria: "С учётом склада",
    modeQuickAria: "Без учёта склада",
    groups: SETUP_WIZARD_CATEGORY_GROUPS,
  },
  warranty: {
    customHint: "На каждой сделке",
    noWarranty: "Без гарантии",
  },
  actions: {
    back: "Назад",
    next: "Далее",
    skipCategories: "Пропустить",
    finish: "Готово",
    saving: "Сохраняем…",
    stepCounter: (current: number, total: number) => `${current} / ${total}`,
    modulesSelected: (count: number, total: number) => `${count}/${total}`,
    categoriesSelected: (count: number) => (count === 0 ? "0" : String(count)),
  },
  validation: {
    pickModule: "Выберите хотя бы один раздел.",
    saveFailed: "Не удалось сохранить. Попробуйте снова.",
  },
  success: {
    title: "Готово",
    subtitle: "Открываем рабочее пространство…",
  },
  settings: {
    title: "Система",
    subtitle: "Разделы меню, каталог запчастей и гарантия по умолчанию.",
    hint: "Изменения применяются к меню и рабочим разделам после сохранения.",
    save: "Сохранить",
    saving: "Сохраняем…",
    saved: "Настройки системы сохранены",
  },
} as const;

export type BusinessPresetId = (typeof SETUP_WIZARD_COPY.presets.options)[number]["id"];

export function modulesForPreset(preset: BusinessPresetId): Record<CompanyModuleKey, boolean> {
  switch (preset) {
    case "service":
      return {
        motors: false,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: false,
      };
    case "dismantling":
      return {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: false,
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
    SETUP_WIZARD_CATEGORY_PRESETS.filter((item) =>
      (ids as readonly string[]).includes(item.id),
    );

  switch (preset) {
    case "service":
      return [];
    case "dismantling":
      return byId(["gearboxes", "transfer_cases", "alternators"]);
    case "full":
    default:
      return byId(["gearboxes", "transfer_cases", "alternators", "bumpers"]);
  }
}
