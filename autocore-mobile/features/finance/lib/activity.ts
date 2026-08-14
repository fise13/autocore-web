import { format, isToday, isYesterday } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { operationTypeLabel } from '@/lib/accounting/labels';

import type { FinanceActivityDay, FinanceActivityEntry } from '../types';
import {
  flowNode,
  isEngineSale,
  isIncome,
  operationContext,
} from './classify';
import type { DatedOperation } from './series';

const TITLES: Record<string, string> = {
  motor_sale: 'Engine sold',
  work_order_income: 'Work order paid',
  work_order_parts_cost: 'Parts consumed',
  payroll: 'Payroll',
  motor_import: 'Engine purchase',
  warehouse_import: 'Stock purchase',
  logistics: 'Logistics',
  transport: 'Transport',
  delivery: 'Delivery',
  fuel: 'Fuel',
  advertising: 'Advertising',
  office: 'Office',
  taxes: 'Taxes',
  supplies: 'Supplies',
};

function sentenceCase(value: string): string {
  const cleaned = value.replace(/[_-]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

/**
 * The row says what happened, not which ledger bucket it landed in — a
 * category is a better answer than "Expense" whenever one was recorded.
 */
function entryTitle(entry: DatedOperation): string {
  const { operation } = entry;
  const category = operation.category?.trim();
  if (category) {
    const known = TITLES[category];
    if (known) return known;
    return sentenceCase(category);
  }
  if (isEngineSale(operation)) return 'Engine sold';
  return operationTypeLabel(operation.type);
}

function dayLabel(at: Date): string {
  if (isToday(at)) return 'Today';
  if (isYesterday(at)) return 'Yesterday';
  return format(at, 'EEEE d MMMM', { locale: enUS });
}

/**
 * Activity reads as a timeline of what the business did, not a table of rows:
 * each entry names the entity the money moved through wherever the ledger
 * records one.
 */
export function buildActivity(
  dated: DatedOperation[],
  workOrderNumbers: Record<string, string>,
  limit = 12,
): FinanceActivityDay[] {
  const recent = [...dated]
    .filter((entry) => entry.operation.type !== 'transfer')
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, limit);

  const days = new Map<string, FinanceActivityDay>();

  for (const entry of recent) {
    const key = format(entry.at, 'yyyy-MM-dd');
    const day =
      days.get(key) ??
      ({ key, label: dayLabel(entry.at), entries: [], net: 0 } satisfies FinanceActivityDay);

    const income = isIncome(entry.operation);
    const activity: FinanceActivityEntry = {
      id: entry.operation.id,
      title: entryTitle(entry),
      context: operationContext(entry.operation, workOrderNumbers),
      amount: entry.operation.amount,
      direction: income ? 'in' : 'out',
      at: entry.at,
      time: format(entry.at, 'HH:mm'),
      channel: flowNode(entry.operation),
      operation: entry.operation,
    };

    day.entries.push(activity);
    day.net += income ? entry.operation.amount : -entry.operation.amount;
    days.set(key, day);
  }

  return [...days.values()];
}
