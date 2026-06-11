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

import type { CompanyModuleKey, CompanySpecificCategoryConfig } from "@/domain/company-config";
import { SETUP_WIZARD_CATEGORY_PRESETS } from "@/domain/company-config";

export type SetupWizardStepId = 1 | 2 | 3;

export type SetupWizardStepMeta = {
  id: SetupWizardStepId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

export const SETUP_WIZARD_COPY = {
  shell: {
    title: "Настройка компании",
    subtitle: "Выберите, что будете вести в AutoCore. Всё можно изменить позже в настройках.",
    loadingTitle: "Загружаем настройки",
    loadingSubtitle: "Проверяем конфигурацию вашей компании…",
  },
  steps: [
    {
      id: 1,
      title: "Разделы системы",
      subtitle: "Отметьте направления работы — в меню останутся только нужные разделы.",
      icon: Sparkles,
    },
    {
      id: 2,
      title: "Каталог запчастей",
      subtitle: "Выберите типы деталей и способ учёта: склад или быстрая продажа.",
      icon: Boxes,
    },
    {
      id: 3,
      title: "Гарантия клиентам",
      subtitle: "Шаблон по умолчанию для моторов и продаж. На сделке можно изменить.",
      icon: ShieldCheck,
    },
  ] satisfies SetupWizardStepMeta[],
  presets: {
    title: "Быстрый старт",
    hint: "Подставим типовой набор — вы сможете уточнить ниже.",
    options: [
      {
        id: "service",
        label: "СТО и сервис",
        description: "Заказ-наряды, склад, бухгалтерия",
      },
      {
        id: "dismantling",
        label: "Разбор моторов",
        description: "Моторы, продажи, гарантийные документы",
      },
      {
        id: "full",
        label: "Полный цикл",
        description: "Сервис, моторы, склад и запчасти",
      },
    ] as const,
  },
  modules: {
    motors: {
      label: "Моторы и продажи",
      description: "Учёт двигателей, сделки и гарантийные PDF",
    },
    workOrders: {
      label: "Заказ-наряды",
      description: "Приём работ, запчасти, зарплата и документы",
    },
    accounting: {
      label: "Бухгалтерия",
      description: "Операции, счета и отчёты",
    },
    warehouse: {
      label: "Склад",
      description: "Остатки, перемещения и импорт",
    },
    specifics: {
      label: "Запчасти по каталогу",
      description: "Коробки, электрика, кузовные детали",
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
    specificsDisabled:
      "Раздел «Запчасти по каталогу» выключен. Вернитесь на шаг 1 или нажмите «Пропустить».",
    emptyHint: "Выберите, если работаете с этой категорией",
    trackedHint: "Остатки на складе и полный учёт",
    quickHint: "Продажа без склада — сразу в заказ-наряд",
    modeTracked: "Складской учёт",
    modeQuick: "Быстрая продажа",
    groups: [
      { id: "mechanics", label: "Агрегаты", ids: ["gearboxes", "transfer_cases", "turbos", "pumps"] },
      { id: "electrical", label: "Электрика", ids: ["ecu", "alternators", "starters"] },
      { id: "body", label: "Кузов", ids: ["bumpers", "headlights", "fenders"] },
    ] as const,
  },
  warranty: {
    customHint: "Условия задаёте вручную на каждой сделке",
    noWarranty: "Без гарантийных обязательств",
  },
  actions: {
    back: "Назад",
    next: "Продолжить",
    skipCategories: "Пропустить",
    finish: "Запустить AutoCore",
    saving: "Сохраняем…",
    stepCounter: (current: number, total: number) => `Шаг ${current} из ${total}`,
    modulesSelected: (count: number, total: number) => `${count} из ${total} разделов`,
    categoriesSelected: (count: number) =>
      count === 0 ? "Категории не выбраны" : `${count} категорий`,
  },
  validation: {
    pickModule: "Выберите хотя бы один раздел системы.",
    saveFailed: "Не удалось сохранить настройки. Попробуйте ещё раз.",
  },
  success: {
    title: "Компания настроена",
    subtitle: "Сохранили выбор и открываем рабочее пространство…",
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
  const byId = (ids: string[]) =>
    SETUP_WIZARD_CATEGORY_PRESETS.filter((item) => ids.includes(item.id));

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
