import type { CompanyAppConfig, CompanyModuleKey } from '@/types/company-config';

export type BusinessPresetId = 'service' | 'dismantling' | 'full';

export const DEFAULT_COMPANY_MODULES: Record<CompanyModuleKey, boolean> = {
  motors: true,
  workOrders: true,
  accounting: true,
  warehouse: false,
  specifics: true,
};

const CATEGORY_PRESETS: CompanyAppConfig['specificCategories'] = [
  { id: 'gearboxes', name: 'КПП', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'gearboxes' },
  { id: 'transfer_cases', name: 'Раздатки', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'transfer_cases' },
  { id: 'turbos', name: 'Турбины', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'turbos' },
  { id: 'reducers', name: 'Редукторы', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'reducers' },
  { id: 'body', name: 'Кузовщина', mode: 'quick', groupId: 'parts', subcategoryId: 'body' },
  { id: 'optics', name: 'Оптика', mode: 'quick', groupId: 'parts', subcategoryId: 'optics' },
  { id: 'electrical', name: 'Электрика', mode: 'quick', groupId: 'parts', subcategoryId: 'electrical' },
];

export function defaultCompanyAppConfig(): CompanyAppConfig {
  return {
    onboardingCompleted: false,
    modules: { ...DEFAULT_COMPANY_MODULES },
    specificCategories: CATEGORY_PRESETS.filter((item) =>
      ['gearboxes', 'body', 'optics', 'electrical'].includes(item.id),
    ),
    defaultWarrantyTemplate: 'contract_engine',
    taxonomyVersion: 2,
  };
}

export function modulesForPreset(preset: BusinessPresetId): Record<CompanyModuleKey, boolean> {
  switch (preset) {
    case 'service':
      return {
        motors: false,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      };
    case 'dismantling':
      return {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      };
    case 'full':
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

export function categoriesForPreset(preset: BusinessPresetId): CompanyAppConfig['specificCategories'] {
  const byId = (ids: string[]) => CATEGORY_PRESETS.filter((item) => ids.includes(item.id));

  switch (preset) {
    case 'service':
      return [];
    case 'dismantling':
      return byId(['gearboxes', 'transfer_cases', 'turbos', 'body', 'optics']);
    case 'full':
    default:
      return byId(['gearboxes', 'transfer_cases', 'turbos', 'reducers', 'body', 'optics', 'electrical']);
  }
}

export const MODULE_LABELS: Record<CompanyModuleKey, { label: string; description: string }> = {
  motors: { label: 'Двигатели', description: 'Агрегаты и продажи' },
  workOrders: { label: 'Заказ-наряды', description: 'Приём и цех' },
  accounting: { label: 'Финансы', description: 'Операции и счета' },
  warehouse: { label: 'Расходники', description: 'Масла, фильтры, склад' },
  specifics: { label: 'Каталог учёта', description: 'Агрегаты и запчасти' },
};

export const BUSINESS_PRESETS: Array<{
  id: BusinessPresetId;
  label: string;
  description: string;
}> = [
  { id: 'service', label: 'СТО', description: 'Наряды · склад' },
  { id: 'dismantling', label: 'Разбор', description: 'Моторы · продажи' },
  { id: 'full', label: 'Всё', description: 'Полный цикл' },
];

export const WARRANTY_OPTIONS = [
  { id: 'contract_engine', label: 'Гарантия на двигатель' },
  { id: 'contract_alternator', label: 'Гарантия на агрегат' },
  { id: 'no_warranty', label: 'Без гарантии' },
] as const;
