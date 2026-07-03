import { format, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { View } from 'react-native';

import { ReceiptIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
  paymentMethodLabel,
} from '@/lib/accounting/labels';
import type { FinancialOperation } from '@/types/financial-operation';

import { ac } from '../layout';
import { AcDivider } from './ac-primitives';
import { formatKzt } from '../utils/format';

type AcOperationsListProps = {
  title: string;
  description?: string;
  rows: FinancialOperation[];
  emptyLabel?: string;
  showWorkOrder?: boolean;
  workOrderNumbers?: Record<string, string>;
};

function formatOperationTime(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm');
  return format(date, 'd MMM, HH:mm', { locale: ru });
}

function amountTone(type: FinancialOperation['type'], colors: ReturnType<typeof useTheme>['colors']) {
  if (type === 'income' || type === 'sale') return colors.success;
  if (type === 'expense' || type === 'refund') return colors.destructive;
  return colors.foreground;
}

function OperationRow({
  operation,
  isLast,
  showWorkOrder,
  workOrderNumbers,
}: {
  operation: FinancialOperation;
  isLast: boolean;
  showWorkOrder?: boolean;
  workOrderNumbers?: Record<string, string>;
}) {
  const { colors } = useTheme();
  const category = operationCategoryLabel(operation.category);
  const workOrderLabel =
    showWorkOrder && operation.relatedWorkOrderId
      ? workOrderNumbers?.[operation.relatedWorkOrderId] ?? operation.relatedWorkOrderId
      : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <ReceiptIcon size="sm" color={colors.primary} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
            {operationTypeLabel(operation.type)}
            {category !== '—' ? ` · ${category}` : ''}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
            {operationAccountLabel(operation.account)} · {paymentMethodLabel(operation.paymentMethod)}
            {workOrderLabel ? ` · ${workOrderLabel}` : ''}
          </Text>
          {operation.comment ? (
            <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
              {operation.comment}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text
            variant="body"
            style={{
              fontSize: 14,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              color: amountTone(operation.type, colors),
            }}
          >
            {formatKzt(operation.amount)}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
            {formatOperationTime(operation.createdAt)}
          </Text>
        </View>
      </View>
      {!isLast ? <AcDivider inset={50} /> : null}
    </View>
  );
}

export function AcOperationsList({
  title,
  description,
  rows,
  emptyLabel = 'Операций пока нет',
  showWorkOrder,
  workOrderNumbers,
}: AcOperationsListProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderWidth: ac.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: ac.cardRadius,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: ac.hairline,
          borderBottomColor: colors.border,
          backgroundColor: toneBackground(colors.muted, 0.35),
          gap: 3,
        }}
      >
        <Text variant="body" style={{ fontSize: 15, fontWeight: '700' }}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
            {description}
          </Text>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            {emptyLabel}
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 14 }}>
          {rows.map((operation, index) => (
            <OperationRow
              key={operation.id}
              operation={operation}
              isLast={index === rows.length - 1}
              showWorkOrder={showWorkOrder}
              workOrderNumbers={workOrderNumbers}
            />
          ))}
        </View>
      )}
    </View>
  );
}
