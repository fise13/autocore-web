import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from '@/lib/accounting/labels';
import { coerceToDate, formatTimestamp } from '@/lib/firestore-timestamp';
import type { FinancialOperation } from '@/types/financial-operation';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function operationToCsvRow(operation: FinancialOperation): string {
  return [
    formatTimestamp(operation.createdAt, 'dd.MM.yyyy HH:mm'),
    operationTypeLabel(operation.type),
    operationCategoryLabel(operation.category),
    operationAccountLabel(operation.account),
    String(operation.amount),
    operation.comment ?? '',
  ]
    .map((cell) => escapeCsv(cell))
    .join(',');
}

export function buildOperationsCsv(operations: FinancialOperation[]): string {
  const header = 'Date,Type,Category,Account,Amount,Comment';
  // `createdAt` is typed as a Date but can reach here as a Firestore Timestamp
  // or a rehydrated string, neither of which has `getTime`.
  const rows = [...operations]
    .sort((a, b) => (coerceToDate(b.createdAt)?.getTime() ?? 0) - (coerceToDate(a.createdAt)?.getTime() ?? 0))
    .map(operationToCsvRow);
  return [header, ...rows].join('\n');
}

export async function shareOperationsCsv(operations: FinancialOperation[]): Promise<void> {
  const csv = buildOperationsCsv(operations);
  const filename = `autocore-operations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create({ overwrite: true });
  file.write(new TextEncoder().encode(csv));

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('File sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export Operations',
  });
}
