import type { FinancialOperation } from '@/types/financial-operation';

export const MOTOR_SALE_CATEGORY = 'motor_sale';

export function isMotorSaleOperation(operation: FinancialOperation): boolean {
  return (
    operation.category === MOTOR_SALE_CATEGORY ||
    (operation.type === 'sale' &&
      (operation.relatedMotorId != null || operation.relatedMotorID != null))
  );
}

export function motorSaleMotorId(operation: FinancialOperation): string | null {
  if (operation.relatedMotorId?.trim()) return operation.relatedMotorId.trim();
  if (operation.relatedMotorID != null && Number.isFinite(operation.relatedMotorID)) {
    return String(operation.relatedMotorID);
  }
  return null;
}

export function motorSaleDetail(operation: FinancialOperation): string {
  return (operation.description || operation.details || operation.comment || '—').trim();
}
