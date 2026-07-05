import type { WorkOrderLaborLine, WorkOrderLaborPricingMode } from '@/types/work-order';

export function normalizeLaborPricingMode(
  mode: WorkOrderLaborPricingMode | string | undefined,
): WorkOrderLaborPricingMode {
  return mode === 'hourly' ? 'hourly' : 'fixed';
}

export function laborLineTotal(
  line: Pick<WorkOrderLaborLine, 'pricingMode' | 'hours' | 'unitPrice'>,
): number {
  const mode = normalizeLaborPricingMode(line.pricingMode);
  if (mode === 'fixed') return Number(line.unitPrice || 0);
  return Number(line.hours || 0) * Number(line.unitPrice || 0);
}
