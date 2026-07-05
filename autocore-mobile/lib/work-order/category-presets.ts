import type { CompanyAppConfig } from '@/types/company-config';

export const SETUP_WIZARD_CATEGORY_PRESETS: CompanyAppConfig['specificCategories'] = [
  { id: 'gearboxes', name: 'КПП', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'gearboxes' },
  { id: 'body', name: 'Кузовщина', mode: 'quick', groupId: 'parts', subcategoryId: 'body' },
  { id: 'optics', name: 'Оптика', mode: 'quick', groupId: 'parts', subcategoryId: 'optics' },
  { id: 'interior', name: 'Салон', mode: 'quick', groupId: 'parts', subcategoryId: 'interior' },
  { id: 'suspension', name: 'Подвеска', mode: 'quick', groupId: 'parts', subcategoryId: 'suspension' },
  {
    id: 'electrical',
    name: 'Электрика',
    mode: 'quick',
    groupId: 'parts',
    subcategoryId: 'electrical',
    warrantyDefault: 'contract_alternator',
  },
];

export function resolveQuickSpecificCategories(
  categories: CompanyAppConfig['specificCategories'] | undefined,
) {
  const fromConfig = (categories ?? []).filter((item) => item.mode === 'quick');
  if (fromConfig.length > 0) return fromConfig;
  return SETUP_WIZARD_CATEGORY_PRESETS.filter((item) => item.mode === 'quick');
}
