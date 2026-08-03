import { memo } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Alert, Pressable, View } from 'react-native';

import { FileStackIcon } from '@/assets/icons';
import { ListGroup, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import {
  isMotorSaleOperation,
  motorSaleDetail,
} from '@/lib/accounting/motor-sale';
import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from '@/lib/accounting/labels';
import { haptics, rhythm } from '@/theme';
import type { FinancialOperation, OperationType } from '@/types/financial-operation';
import { McSectionTitle } from '@/features/overview/components/mc-primitives';
import { mcType } from '@/features/overview/layout';

import { ac } from '../layout';
import { formatKzt } from '../utils/format';
import { formatTimestamp } from '@/lib/firestore-timestamp';

type AcOperationsListProps = {
  title: string;
  description?: string;
  rows: FinancialOperation[];
  emptyLabel?: string;
  showWorkOrder?: boolean;
  workOrderNumbers?: Record<string, string>;
  canEdit?: boolean;
  onDelete?: (operation: FinancialOperation) => void;
  onMotorSaleSelect?: (operation: FinancialOperation) => void;
};

function typeBadgeColors(
  type: OperationType,
  colors: ReturnType<typeof useTheme>['colors'],
): { bg: string; fg: string } {
  switch (type) {
    case 'sale':
      return { bg: toneBackground(colors.primary, 0.14), fg: colors.primary };
    case 'income':
      return { bg: toneBackground(colors.success, 0.14), fg: colors.success };
    case 'expense':
    case 'refund':
      return { bg: toneBackground(colors.destructive, 0.14), fg: colors.destructive };
    default:
      return { bg: colors.secondary, fg: colors.textSecondary };
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
  const motorSale = isMotorSaleOperation(operation);
  const category = operationCategoryLabel(operation.category);
  const detail = motorSaleDetail(operation);
  const badge = typeBadgeColors(operation.type, colors);
  const workOrderLabel =
    showWorkOrder && operation.relatedWorkOrderId
      ? workOrderNumbers?.[operation.relatedWorkOrderId] ?? operation.relatedWorkOrderId
      : null;

  const confirmDelete = () => {
    Alert.alert('Delete this operation?', 'The entry will be removed from the journal.', [
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
    <Pressable
      accessibilityRole={motorSale && onMotorSaleSelect ? 'button' : undefined}
      onPress={() => {
        if (motorSale && onMotorSaleSelect) {
          haptics.selection();
          onMotorSaleSelect(operation);
        }
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: ac.rowGap,
        paddingVertical: ac.rowPadY,
        paddingHorizontal: ac.rowPadX,
        minHeight: ac.rowHeight,
      }}
    >
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: rhythm.inline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1, ...mcType.rowTitle }}>
              {category}
            </Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: badge.bg }}>
              <Text variant="caption" style={{ fontSize: 10, fontWeight: '600', color: badge.fg }}>
                {operationTypeLabel(operation.type)}
              </Text>
            </View>
          </View>
          <Text
            variant="bodyStrong"
            style={{ flexShrink: 0, fontVariant: ['tabular-nums'], ...mcType.quietValue }}
          >
            {formatKzt(operation.amount)}
          </Text>
        </View>
        <Text variant="meta" color="muted" numberOfLines={2} style={mcType.rowMeta}>
          {[detail, workOrderLabel, operationAccountLabel(operation.account)]
            .filter(Boolean)
            .join(' · ')}
          <Text variant="meta" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {' · '}
            {formatTimestamp(operation.createdAt, 'd MMM, HH:mm')}
          </Text>
        </Text>
      </View>

      {(motorSale && onMotorSaleSelect) || (onDelete && canEdit) ? (
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
          {motorSale && onMotorSaleSelect ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="PDF"
              onPress={() => {
                haptics.selection();
                onMotorSaleSelect(operation);
              }}
              hitSlop={4}
            >
              <FileStackIcon size="sm" color={colors.primary} strokeWidth={1.75} />
            </Pressable>
          ) : null}
          {onDelete && canEdit ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={confirmDelete} hitSlop={4}>
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: colors.destructive }}>
                Delete
              </Text>
            </Pressable>
          ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
});

const MAX_VISIBLE_ROWS = 50;

export function AcOperationsList({
  title,
  description,
  rows,
  emptyLabel = 'No operations yet',
  showWorkOrder,
  workOrderNumbers,
  canEdit,
  onDelete,
  onMotorSaleSelect,
}: AcOperationsListProps) {
  const visible = rows.slice(0, MAX_VISIBLE_ROWS);

  return (
    <View style={{ gap: ac.sectionGap }}>
      <McSectionTitle title={title} />
      {description ? (
        <Text variant="meta" color="muted" style={{ ...mcType.rowMeta, marginTop: -4 }}>
          {description}
        </Text>
      ) : null}

      {visible.length === 0 ? (
        <Text variant="caption" color="muted" style={{ paddingVertical: rhythm.section }}>
          {emptyLabel}
        </Text>
      ) : (
        <ListGroup inset={false}>
          {visible.map((operation) => (
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
        </ListGroup>
      )}

      {rows.length > MAX_VISIBLE_ROWS ? (
        <Text variant="caption" color="muted" style={{ textAlign: 'center', paddingTop: rhythm.tight }}>
          Showing the first {MAX_VISIBLE_ROWS} of {rows.length}
        </Text>
      ) : null}
    </View>
  );
}
