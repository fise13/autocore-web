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
  { id: 'gearboxes', name: 'Transmissions', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'gearboxes' },
  { id: 'transfer_cases', name: 'Transfer cases', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'transfer_cases' },
  { id: 'turbos', name: 'Turbochargers', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'turbos' },
  { id: 'reducers', name: 'Differentials', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'reducers' },
  { id: 'body', name: 'Body parts', mode: 'quick', groupId: 'parts', subcategoryId: 'body' },
  { id: 'optics', name: 'Lighting', mode: 'quick', groupId: 'parts', subcategoryId: 'optics' },
  { id: 'electrical', name: 'Electrical', mode: 'quick', groupId: 'parts', subcategoryId: 'electrical' },
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
    displayCurrency: 'USD',
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
  motors: { label: 'Engines', description: 'Units and sales' },
  workOrders: { label: 'Work orders', description: 'Intake and shop floor' },
  accounting: { label: 'Finance', description: 'Transactions and invoices' },
  warehouse: { label: 'Supplies', description: 'Oil, filters, stock' },
  specifics: { label: 'Inventory catalog', description: 'Units and parts' },
};

export const BUSINESS_PRESETS: Array<{
  id: BusinessPresetId;
  label: string;
  description: string;
}> = [
  { id: 'service', label: 'Repair shop', description: 'Work orders · supplies' },
  { id: 'dismantling', label: 'Dismantling', description: 'Engines · sales' },
  { id: 'full', label: 'Everything', description: 'Full cycle' },
];

export const WARRANTY_OPTIONS = [
  { id: 'contract_engine', label: 'Engine warranty' },
  { id: 'contract_alternator', label: 'Unit warranty' },
  { id: 'no_warranty', label: 'No warranty' },
] as const;
