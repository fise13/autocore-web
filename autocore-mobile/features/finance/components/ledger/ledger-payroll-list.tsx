import { ActivityIndicator, View } from 'react-native';

import { UsersIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { nextPayrollStatus, PAYROLL_STATUS_LABELS } from '@/lib/accounting/payroll-status';
import { formatTimestamp } from '@/lib/firestore-timestamp';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import type { PayrollTransaction, PayrollTransactionStatus } from '@/types/payroll-transaction';

import { fin, finFontCap, finType } from '../../layout';
import { formatMoneyAdaptive } from '../../lib/format';
import { FinDivider, FinPressable, FinSheet } from '../fin-primitives';

type LedgerPayrollListProps = {
  rows: PayrollTransaction[];
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
  canEdit?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: PayrollTransactionStatus) => void;
};

function statusColor(
  status: PayrollTransactionStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'paid':
      return colors.success;
    case 'cancelled':
      return colors.mutedForeground;
    default:
      return colors.warning;
  }
}

function PayrollStatusBadge({
  status,
  canEdit,
  isUpdating,
  onPress,
}: {
  status: PayrollTransactionStatus;
  canEdit?: boolean;
  isUpdating?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const color = statusColor(status, colors);
  const label = isUpdating ? 'Updating…' : PAYROLL_STATUS_LABELS[status];

  const badge = (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: fin.pillRadius,
        backgroundColor: withAlpha(color, 0.14),
      }}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={{ ...finType.caption, fontWeight: '600', color }}>{label}</Text>
      )}
    </View>
  );

  if (!canEdit || !onPress) return badge;

  return (
    <FinPressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityHint="Tap to advance status: Due → Paid → Cancelled"
      accessibilityLabel={`Status ${label}`}
    >
      {badge}
    </FinPressable>
  );
}

function PayrollRow({
  row,
  employeeNames,
  workOrderNumbers,
  canEdit,
  updatingId,
  onStatusChange,
}: {
  row: PayrollTransaction;
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
  canEdit?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: PayrollTransactionStatus) => void;
}) {
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const employee = employeeNames[row.employeeId] ?? 'Employee';
  const workOrder = workOrderNumbers[row.workOrderId] ?? row.workOrderId;
  const isUpdating = updatingId === row.id;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: fin.stack,
        paddingVertical: 11,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(colors.primary, 0.1),
        }}
      >
        <UsersIcon size={18} color={colors.primary} strokeWidth={1.9} />
      </View>

      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={finType.rowTitle} numberOfLines={1}>
          {employee}
        </Text>
        <Text style={finType.caption} color="muted" numberOfLines={1}>
          {workOrder} · {row.role} · {formatTimestamp(row.createdAt, 'd MMM')}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text
          style={{ ...finType.amount, color: colors.foreground }}
          maxFontSizeMultiplier={finFontCap.metric}
        >
          {formatMoneyAdaptive(row.amount)}
        </Text>
        <PayrollStatusBadge
          status={row.status}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onPress={
            canEdit && onStatusChange
              ? () => onStatusChange(row.id, nextPayrollStatus(row.status))
              : undefined
          }
        />
      </View>
    </View>
  );
}

export function LedgerPayrollList({
  rows,
  employeeNames,
  workOrderNumbers,
  canEdit,
  updatingId,
  onStatusChange,
}: LedgerPayrollListProps) {
  return (
    <FinSheet padded>
      <View style={{ gap: fin.stack - 4 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ ...finType.rowTitle, fontWeight: '600' }}>Payroll</Text>
          <Text style={finType.caption} color="muted">
            {canEdit
              ? 'Completed work-order labor. Tap a status badge to mark paid.'
              : 'Completed work-order labor.'}
          </Text>
        </View>

        {rows.length === 0 ? (
          <Text style={finType.rowMeta} color="muted">
            No payroll yet. Entries appear when a work order with labor and assigned staff is
            completed.
          </Text>
        ) : (
          <View>
            {rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 ? <FinDivider inset={fin.stack + 20} /> : null}
                <PayrollRow
                  row={row}
                  employeeNames={employeeNames}
                  workOrderNumbers={workOrderNumbers}
                  canEdit={canEdit}
                  updatingId={updatingId}
                  onStatusChange={onStatusChange}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </FinSheet>
  );
}
