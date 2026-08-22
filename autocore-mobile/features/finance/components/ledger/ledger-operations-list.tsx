import { format, isToday, isYesterday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { memo, useMemo } from 'react';
import { Alert, View } from 'react-native';

import { FileStackIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import {
  isMotorSaleOperation,
  motorSaleDetail,
} from '@/lib/accounting/motor-sale';
import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from '@/lib/accounting/labels';
import { mixedCashPortion, mixedTransferPortion } from '@/lib/accounting/mixed-payment';
import { formatTimestamp } from '@/lib/firestore-timestamp';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import type { FinancialOperation, OperationType } from '@/types/financial-operation';

import { fin, finFontCap, finType } from '../../layout';
import { isIncome, operationContext, operationAt } from '../../lib/classify';
import { formatMoneyAdaptive, formatSignedMoney } from '../../lib/format';
import { toneColor, toneForValue } from '../../lib/tone';
import { FinDivider, FinPressable, FinSheet } from '../fin-primitives';

const MAX_ROWS = 50;

type LedgerDayGroup = {
  key: string;
  label: string;
  net: number;
  rows: FinancialOperation[];
};

function dayLabel(at: Date): string {
  if (isToday(at)) return 'Today';
  if (isYesterday(at)) return 'Yesterday';
  return format(at, 'EEEE d MMMM', { locale: enUS });
}

function groupOperations(rows: FinancialOperation[]): LedgerDayGroup[] {
  const map = new Map<string, LedgerDayGroup>();

  for (const operation of rows) {
    const at = operationAt(operation);
    if (!at) continue;
    const key = format(at, 'yyyy-MM-dd');
    const group =
      map.get(key) ??
      ({
        key,
        label: dayLabel(at),
        net: 0,
        rows: [],
      } satisfies LedgerDayGroup);
    group.rows.push(operation);
    const signed = isIncome(operation) ? operation.amount : -operation.amount;
    group.net += signed;
    map.set(key, group);
  }

  return [...map.values()].sort((left, right) => right.key.localeCompare(left.key));
}

function accountDetail(operation: FinancialOperation): string {
  const cash = mixedCashPortion(operation);
  const transfer = mixedTransferPortion(operation);
  if (cash != null && transfer != null) {
    return `Cash ${formatMoneyAdaptive(cash)} · Card ${formatMoneyAdaptive(transfer)}`;
  }
  if (operation.paymentMethod === 'mixed') return 'Mixed payment';
  return operationAccountLabel(operation.account);
}

function typeAccent(
  type: OperationType,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (type) {
    case 'sale':
    case 'income':
      return colors.success;
    case 'expense':
    case 'refund':
      return colors.foreground;
    default:
      return colors.primary;
  }
}

const OperationRow = memo(function OperationRow({
  operation,
  showWorkOrder,
  workOrderNumbers,
  canEdit,
  onDelete,
  onMotorSaleSelect,
}: {
  operation: FinancialOperation;
  showWorkOrder?: boolean;
  workOrderNumbers?: Record<string, string>;
  canEdit?: boolean;
  onDelete?: (operation: FinancialOperation) => void;
  onMotorSaleSelect?: (operation: FinancialOperation) => void;
}) {
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const motorSale = isMotorSaleOperation(operation);
  const incoming = isIncome(operation);
  const accent = typeAccent(operation.type, colors);
  const tone = toneForValue(incoming ? operation.amount : -operation.amount);

  const title = operationCategoryLabel(operation.category) || operationTypeLabel(operation.type);
  const detail = motorSale
    ? motorSaleDetail(operation)
    : operationContext(operation, workOrderNumbers ?? {});
  const workOrderLabel =
    showWorkOrder && operation.relatedWorkOrderId
      ? workOrderNumbers?.[operation.relatedWorkOrderId] ?? operation.relatedWorkOrderId
      : null;

  const confirmDelete = () => {
    Alert.alert('Delete this operation?', 'The entry will be removed from the ledger.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          onDelete?.(operation);
        },
      },
    ]);
  };

  return (
    <FinPressable
      onPress={
        motorSale && onMotorSaleSelect
          ? () => {
              haptics.selection();
              onMotorSaleSelect(operation);
            }
          : undefined
      }
      haptic="light"
      accessibilityLabel={`${title}, ${formatMoneyAdaptive(operation.amount)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: fin.stack - 4,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          marginTop: 6,
          backgroundColor: accent,
        }}
      />

      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: fin.inline }}>
          <Text style={finType.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={{
              ...finType.amount,
              color: toneColor(tone, colors),
            }}
            maxFontSizeMultiplier={finFontCap.metric}
            numberOfLines={1}
          >
            {formatSignedMoney(operation.amount, incoming ? 'in' : 'out')}
          </Text>
        </View>

        <Text style={finType.caption} color="muted" numberOfLines={2}>
          {[detail, workOrderLabel, accountDetail(operation), formatTimestamp(operation.createdAt, 'HH:mm')]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {(motorSale && onMotorSaleSelect) || (onDelete && canEdit) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.tight, paddingTop: 2 }}>
          {motorSale && onMotorSaleSelect ? (
            <FinPressable
              onPress={() => onMotorSaleSelect(operation)}
              accessibilityLabel="Open sale documents"
              style={{ padding: 4 }}
            >
              <FileStackIcon size={16} color={colors.primary} strokeWidth={1.75} />
            </FinPressable>
          ) : null}
          {onDelete && canEdit ? (
            <FinPressable
              onPress={confirmDelete}
              accessibilityLabel="Delete operation"
              style={{ padding: 4 }}
            >
              <Text style={{ ...finType.caption, fontWeight: '600', color: colors.danger }}>
                Delete
              </Text>
            </FinPressable>
          ) : null}
        </View>
      ) : null}
    </FinPressable>
  );
});

export function LedgerOperationsList({
  title,
  caption,
  rows,
  emptyLabel = 'No operations yet',
  showWorkOrder,
  workOrderNumbers,
  canEdit,
  onDelete,
  onMotorSaleSelect,
}: {
  title: string;
  caption?: string;
  rows: FinancialOperation[];
  emptyLabel?: string;
  showWorkOrder?: boolean;
  workOrderNumbers?: Record<string, string>;
  canEdit?: boolean;
  onDelete?: (operation: FinancialOperation) => void;
  onMotorSaleSelect?: (operation: FinancialOperation) => void;
}) {
  const { colors } = useTheme();
  const visible = rows.slice(0, MAX_ROWS);
  const groups = useMemo(() => groupOperations(visible), [visible]);

  if (visible.length === 0) {
    return (
      <FinSheet padded>
        <View style={{ gap: fin.inline }}>
          <Text style={{ ...finType.rowTitle, fontWeight: '600' }}>{title}</Text>
          {caption ? (
            <Text style={finType.caption} color="muted">
              {caption}
            </Text>
          ) : null}
          <Text style={finType.rowMeta} color="muted">
            {emptyLabel}
          </Text>
        </View>
      </FinSheet>
    );
  }

  return (
    <View style={{ gap: fin.stack }}>
      <View style={{ paddingHorizontal: fin.pad, gap: 2 }}>
        <Text style={{ ...finType.rowTitle, fontWeight: '600' }}>{title}</Text>
        {caption ? (
          <Text style={finType.caption} color="muted">
            {caption}
          </Text>
        ) : null}
      </View>

      <FinSheet padded>
        {groups.map((group, groupIndex) => (
          <View key={group.key}>
            {groupIndex > 0 ? <FinDivider inset={0} /> : null}
            <View style={{ gap: fin.micro, paddingVertical: groupIndex > 0 ? fin.stack - 4 : 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingBottom: fin.tight,
                }}
              >
                <Text style={{ ...finType.label, color: colors.foreground }}>{group.label}</Text>
                <Text
                  style={{
                    ...finType.caption,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                    color: toneColor(toneForValue(group.net), colors),
                  }}
                >
                  {formatSignedMoney(group.net)}
                </Text>
              </View>

              {group.rows.map((operation) => (
                <OperationRow
                  key={operation.id}
                  operation={operation}
                  showWorkOrder={showWorkOrder}
                  workOrderNumbers={workOrderNumbers}
                  canEdit={canEdit}
                  onDelete={onDelete}
                  onMotorSaleSelect={onMotorSaleSelect}
                />
              ))}
            </View>
          </View>
        ))}
      </FinSheet>

      {rows.length > MAX_ROWS ? (
        <Text style={{ ...finType.caption, textAlign: 'center', paddingHorizontal: fin.pad }} color="muted">
          Showing the first {MAX_ROWS} of {rows.length}
        </Text>
      ) : null}
    </View>
  );
}
