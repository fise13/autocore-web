import type { CompanyAppConfig } from '@/types/company-config';

export const SETUP_WIZARD_CATEGORY_PRESETS: CompanyAppConfig['specificCategories'] = [
  { id: 'gearboxes', name: 'Transmissions', mode: 'tracked', groupId: 'aggregates', subcategoryId: 'gearboxes' },
  { id: 'body', name: 'Body', mode: 'quick', groupId: 'parts', subcategoryId: 'body' },
  { id: 'optics', name: 'Lighting', mode: 'quick', groupId: 'parts', subcategoryId: 'optics' },
  { id: 'interior', name: 'Interior', mode: 'quick', groupId: 'parts', subcategoryId: 'interior' },
  { id: 'suspension', name: 'Suspension', mode: 'quick', groupId: 'parts', subcategoryId: 'suspension' },
  {
    id: 'electrical',
    name: 'Electrical',
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
