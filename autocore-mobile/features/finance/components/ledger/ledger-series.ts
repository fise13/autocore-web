import { format, subDays, startOfDay } from 'date-fns';

import { isIncome, operationAt } from '../../lib/classify';
import type { FinancialOperation } from '@/types/financial-operation';

export type LedgerDayBucket = {
  key: string;
  label: string;
  count: number;
  net: number;
};

/** Last eight calendar days of ledger volume — bars for the summary chart. */
export function buildLedgerVolumeSeries(
  operations: FinancialOperation[],
  days = 8,
): LedgerDayBucket[] {
  const today = startOfDay(new Date());
  const buckets: LedgerDayBucket[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = subDays(today, offset);
    buckets.push({
      key: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEE'),
      count: 0,
      net: 0,
    });
  }

  const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));

  for (const operation of operations) {
    const at = operationAt(operation);
    if (!at) continue;
    const key = format(startOfDay(at), 'yyyy-MM-dd');
    const slot = index.get(key);
    if (slot == null) continue;
    buckets[slot].count += 1;
    const signed = isIncome(operation) ? operation.amount : -operation.amount;
    buckets[slot].net += signed;
  }

  return buckets;
}
