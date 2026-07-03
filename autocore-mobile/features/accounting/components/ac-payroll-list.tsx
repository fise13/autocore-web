import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { View } from 'react-native';

import { UsersIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import { ac } from '../layout';
import { AcDivider } from './ac-primitives';
import { formatKzt } from '../utils/format';

type AcPayrollListProps = {
  rows: PayrollTransaction[];
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
};

function statusLabel(status: PayrollTransaction['status']): string {
  if (status === 'paid') return 'Выплачено';
  if (status === 'cancelled') return 'Отменено';
  return 'Ожидает';
}

function PayrollRow({
  row,
  employeeNames,
  workOrderNumbers,
  isLast,
}: {
  row: PayrollTransaction;
  employeeNames: Record<string, string>;
  workOrderNumbers: Record<string, string>;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const employee = employeeNames[row.employeeId] ?? 'Сотрудник';
  const workOrder = workOrderNumbers[row.workOrderId] ?? row.workOrderId;

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
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatKzt(row.amount)}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
            {statusLabel(row.status)} · {format(row.createdAt, 'd MMM', { locale: ru })}
          </Text>
        </View>
      </View>
      {!isLast ? <AcDivider inset={50} /> : null}
    </View>
  );
}

export function AcPayrollList({ rows, employeeNames, workOrderNumbers }: AcPayrollListProps) {
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
        <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
          Начисления по завершённым заказ-нарядам.
        </Text>
      </View>

      {rows.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            Начислений пока нет
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
            />
          ))}
        </View>
      )}
    </View>
  );
}
