export const WARRANTY_TEMPLATE_IDS = [
  'contract_engine',
  'contract_transmission',
  'contract_starter',
  'contract_alternator',
  'no_warranty',
  'custom',
] as const;

export type WarrantyTemplateId = (typeof WARRANTY_TEMPLATE_IDS)[number];

const WARRANTY_TEMPLATE_LABELS: Record<WarrantyTemplateId, string> = {
  contract_engine: 'Контрактный двигатель',
  contract_transmission: 'Контрактная АКПП',
  contract_starter: 'Контрактный стартер',
  contract_alternator: 'Контрактный генератор',
  no_warranty: 'Без гарантии',
  custom: 'Своя гарантия',
};

export function warrantyTemplateLabel(id: string): string {
  return WARRANTY_TEMPLATE_LABELS[id as WarrantyTemplateId] ?? id;
}

export function warrantyTemplateOptions(includeNoWarranty = true) {
  return WARRANTY_TEMPLATE_IDS.filter((id) => includeNoWarranty || id !== 'no_warranty').map((id) => ({
    value: id,
    label: WARRANTY_TEMPLATE_LABELS[id],
  }));
}
