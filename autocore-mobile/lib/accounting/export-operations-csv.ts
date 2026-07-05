import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from '@/lib/accounting/labels';
import type { FinancialOperation } from '@/types/financial-operation';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function operationToCsvRow(operation: FinancialOperation): string {
  return [
    format(operation.createdAt, 'dd.MM.yyyy HH:mm', { locale: ru }),
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
  const header = 'Дата,Тип,Категория,Счёт,Сумма,Комментарий';
  const rows = [...operations]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
    throw new Error('На этом устройстве недоступен обмен файлами');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Экспорт операций',
  });
}
