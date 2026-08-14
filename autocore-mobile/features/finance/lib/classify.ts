import { coerceToDate } from '@/lib/firestore-timestamp';
import type { FinancialOperation } from '@/types/financial-operation';

import type { FinanceChannelId, FinanceCostGroupId, FinanceFlowNodeId } from '../types';

/**
 * One place that decides what an operation *is*. Every number on the Finance
 * screen routes through these predicates, so a category rename only has to be
 * handled here.
 */

const INCOME_TYPES = new Set<FinancialOperation['type']>(['sale', 'income']);
const COST_TYPES = new Set<FinancialOperation['type']>(['expense', 'refund']);

const LOGISTICS_CATEGORIES = new Set([
  'logistics',
  'transport',
  'fuel',
  'delivery',
  'shipping',
]);

const INVENTORY_CATEGORIES = new Set([
  'motor_import',
  'warehouse_import',
  'inventory',
  'warehouse',
  'purchase',
]);

export function isIncome(operation: FinancialOperation): boolean {
  return INCOME_TYPES.has(operation.type);
}

export function isCost(operation: FinancialOperation): boolean {
  return COST_TYPES.has(operation.type);
}

/** Transfers move money between own accounts — they are never P&L. */
export function affectsProfit(operation: FinancialOperation): boolean {
  return isIncome(operation) || isCost(operation);
}

export function operationAt(operation: FinancialOperation): Date | undefined {
  return coerceToDate(operation.createdAt);
}

export function isEngineSale(operation: FinancialOperation): boolean {
  if (!isIncome(operation)) return false;
  if (operation.category === 'motor_sale') return true;
  return (
    operation.type === 'sale' &&
    (Boolean(operation.relatedMotorId) || operation.relatedMotorID != null)
  );
}

export function revenueChannel(operation: FinancialOperation): FinanceChannelId {
  if (isEngineSale(operation)) return 'engines';
  if (operation.category === 'work_order_income' || operation.relatedWorkOrderId) {
    return 'work_orders';
  }
  if (operation.relatedInventoryItemId || operation.relatedMovementId) return 'parts';
  return 'other_income';
}

export function costGroup(operation: FinancialOperation): FinanceCostGroupId {
  if (operation.type === 'refund') return 'refunds';
  const category = operation.category?.trim() ?? '';
  if (category === 'work_order_parts_cost') return 'parts_cost';
  if (category === 'payroll') return 'payroll';
  if (LOGISTICS_CATEGORIES.has(category)) return 'logistics';
  if (INVENTORY_CATEGORIES.has(category)) return 'inventory';
  if (operation.relatedInventoryItemId || operation.relatedMotorId || operation.relatedMovementId) {
    return 'inventory';
  }
  return 'other_cost';
}

export function flowNode(operation: FinancialOperation): FinanceFlowNodeId {
  return isIncome(operation) ? revenueChannel(operation) : costGroup(operation);
}

export const CHANNEL_LABELS: Record<FinanceChannelId, string> = {
  engines: 'Engine sales',
  work_orders: 'Work orders',
  parts: 'Parts & stock',
  other_income: 'Other income',
};

export const COST_LABELS: Record<FinanceCostGroupId, string> = {
  inventory: 'Stock purchases',
  parts_cost: 'Parts used',
  payroll: 'Payroll',
  logistics: 'Logistics',
  refunds: 'Refunds',
  other_cost: 'Other costs',
};

export const CHANNEL_ORDER: FinanceChannelId[] = [
  'engines',
  'work_orders',
  'parts',
  'other_income',
];

export const COST_ORDER: FinanceCostGroupId[] = [
  'inventory',
  'parts_cost',
  'payroll',
  'logistics',
  'refunds',
  'other_cost',
];

export function flowNodeLabel(id: FinanceFlowNodeId): string {
  return (
    (CHANNEL_LABELS as Record<string, string>)[id] ??
    (COST_LABELS as Record<string, string>)[id] ??
    id
  );
}

export function isRevenueNode(id: FinanceFlowNodeId): boolean {
  return id in CHANNEL_LABELS;
}

/**
 * Engine sale records are written as `brand code serial` by both the mobile
 * sale flow and the web tool. The serial is the last token and is unique per
 * unit, so the model key is everything before it.
 */
export function engineModelFromOperation(
  operation: FinancialOperation,
): { key: string; label: string; attributed: boolean } {
  const raw = (operation.description ?? '').trim().replace(/\s+/g, ' ');
  const tokens = raw ? raw.split(' ') : [];

  if (tokens.length >= 3) {
    const label = tokens.slice(0, -1).join(' ');
    return { key: label.toLowerCase(), label, attributed: true };
  }

  return { key: '__unattributed__', label: 'Model not recorded', attributed: false };
}

/** Best available human context for an operation — engine, order, or comment. */
export function operationContext(
  operation: FinancialOperation,
  workOrderNumbers: Record<string, string> = {},
): string | null {
  if (isEngineSale(operation)) {
    const description = operation.description?.trim();
    if (description) return description;
  }
  if (operation.relatedWorkOrderId) {
    const number = workOrderNumbers[operation.relatedWorkOrderId];
    if (number) return `Work order ${number}`;
  }
  const fallback =
    operation.description?.trim() ||
    operation.comment?.trim() ||
    operation.details?.trim() ||
    operation.source?.trim();
  return fallback || null;
}
