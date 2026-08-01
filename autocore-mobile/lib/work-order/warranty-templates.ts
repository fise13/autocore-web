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
  contract_engine: 'Contract Engine',
  contract_transmission: 'Contract Transmission',
  contract_starter: 'Contract Starter',
  contract_alternator: 'Contract Alternator',
  no_warranty: 'No Warranty',
  custom: 'Custom Warranty',
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
