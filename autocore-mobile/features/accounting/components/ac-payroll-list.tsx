import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { UsersIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { nextPayrollStatus, PAYROLL_STATUS_LABELS } from '@/lib/accounting/payroll-status';
import { toneBackground } from '@/theme/color-utils';
import { haptics } from '@/theme';
import type { PayrollTransaction, PayrollTransactionStatus } from '@/types/payroll-transaction';

import { ac } from '../layout';
import { AcDivider } from './ac-primitives';
import { formatKzt } from '../utils/format';

type AcPayrollListProps = {
  rows: PayrollTransaction[];
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
  canEdit?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: PayrollTransactionStatus) => void;
};

function statusColors(
  status: PayrollTransactionStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): { bg: string; fg: string } {
  switch (status) {
    case 'paid':
      return { bg: toneBackground(colors.success, 0.14), fg: colors.success };
    case 'cancelled':
      return { bg: toneBackground(colors.muted, 0.5), fg: colors.mutedForeground };
    default:
      return { bg: toneBackground(colors.warning, 0.14), fg: colors.warning };
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
  const palette = statusColors(status, colors);
  const label = isUpdating ? '…' : PAYROLL_STATUS_LABELS[status];

  const badge = (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: palette.bg,
        minWidth: 72,
        alignItems: 'center',
      }}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <Text variant="caption" style={{ fontSize: 10, fontWeight: '600', color: palette.fg }}>
          {label}
        </Text>
      )}
    </View>
  );

  if (!canEdit || !onPress) return badge;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Нажмите, чтобы сменить статус: К выплате → Выплачено → Не выплачивать"
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={6}
    >
      {badge}
    </Pressable>
  );
}

function PayrollRow({
  row,
  employeeNames,
  workOrderNumbers,
  isLast,
  canEdit,
  updatingId,
  onStatusChange,
}: {
  row: PayrollTransaction;
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
  isLast: boolean;
  canEdit?: boolean;
  updatingId?: string | null;
  onStatusChange?: (id: string, status: PayrollTransactionStatus) => void;
}) {
  const { colors } = useTheme();
  const employee = employeeNames[row.employeeId] ?? 'Сотрудник';
  const workOrder = workOrderNumbers[row.workOrderId] ?? row.workOrderId;
  const isUpdating = updatingId === row.id;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
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
          <UsersIcon size="sm" color={colors.primary} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
            {employee}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
            {workOrder} · {row.role}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatKzt(row.amount)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
            <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
              {format(row.createdAt, 'd MMM', { locale: ru })}
            </Text>
          </View>
        </View>
      </View>
      {!isLast ? <AcDivider inset={50} /> : null}
    </View>
  );
}

export function AcPayrollList({
  rows,
  employeeNames,
  workOrderNumbers,
  canEdit,
  updatingId,
  onStatusChange,
}: AcPayrollListProps) {
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
          Зарплаты
        </Text>
        <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {canEdit
            ? 'Начисления по завершённым заказ-нарядам. Нажмите статус, чтобы отметить выплату.'
            : 'Начисления по завершённым заказ-нарядам.'}
        </Text>
      </View>

      {rows.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
            Начислений пока нет. Они появятся после завершения заказ-наряда с работами и исполнителями.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 14 }}>
          {rows.map((row, index) => (
            <PayrollRow
              key={row.id}
              row={row}
              employeeNames={employeeNames}
              workOrderNumbers={workOrderNumbers}
              isLast={index === rows.length - 1}
              canEdit={canEdit}
              updatingId={updatingId}
              onStatusChange={onStatusChange}
            />
          ))}
        </View>
      )}
    </View>
  );
}
