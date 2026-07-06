import { useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useSession, useWorkOrdersRealtime } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useTheme } from '@/hooks/use-theme';
import { rhythm } from '@/theme';

import { ProfileScreenShell } from '../components/profile-screen-shell';

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

export function MyEarningsScreen() {
  const { colors } = useTheme();
  const { uid } = useSession();
  const rbac = useRbacPolicy();
  const allowed = rbac.nav.canAccessMyEarnings;

  const companyId = allowed ? rbac.companyId : null;
  const { payroll } = usePayrollTransactionsRealtime(companyId, {
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });
  const { domainOrders } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const summary = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let cancelled = 0;
    for (const row of payroll) {
      if (row.status === 'paid') paid += row.amount;
      else if (row.status === 'pending') pending += row.amount;
      else cancelled += row.amount;
    }
    return { pending, paid, cancelled };
  }, [payroll]);

  if (!allowed) {
    return (
      <ProfileScreenShell title="Мои начисления">
        <View style={{ padding: rhythm.pad, gap: rhythm.tight }}>
          <Text variant="body" color="muted">
            Раздел доступен механикам с правом просмотра своих выплат.
          </Text>
        </View>
      </ProfileScreenShell>
    );
  }

  return (
    <ProfileScreenShell title="Мои начисления" subtitle="Начисления по закрытым нарядам">
      <View style={{ padding: rhythm.pad, gap: rhythm.section }}>
        <View style={{ flexDirection: 'row', gap: rhythm.stack }}>
          {[
            { label: 'К выплате', value: summary.pending },
            { label: 'Выплачено', value: summary.paid },
            { label: 'Отменено', value: summary.cancelled },
          ].map((tile) => (
            <View
              key={tile.label}
              style={{
                flex: 1,
                padding: rhythm.stack,
                borderRadius: rhythm.cardRadius,
                backgroundColor: colors.card,
                gap: 4,
              }}
            >
              <Text variant="caption" color="muted">
                {tile.label}
              </Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {formatMoney(tile.value)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: rhythm.tight }}>
          <Text variant="sectionLabel">Транзакции</Text>
          {payroll.length === 0 ? (
            <Text variant="body" color="muted">
              Пока нет начислений
            </Text>
          ) : (
            payroll.map((row) => {
              const order = domainOrders.find((entry) => entry.id === row.workOrderId);
              return (
                <View
                  key={row.id}
                  style={{
                    padding: rhythm.stack,
                    borderRadius: rhythm.cardRadius,
                    backgroundColor: colors.card,
                    gap: 4,
                  }}
                >
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {formatMoney(row.amount)} · {row.status}
                  </Text>
                  <Text variant="caption" color="muted">
                    {order ? `Наряд №${order.number}` : row.workOrderId}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ProfileScreenShell>
  );
}
