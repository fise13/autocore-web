import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ClipboardListIcon } from '@/assets/icons';
import { PageHeader, Screen, ScreenScroll, SettingsSectionCard, Switch, Text, toast } from '@/components/ui';
import { McWeekBars } from '@/features/overview/animation';
import type { OverviewWeekBar } from '@/features/overview/types';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useEmployeesRealtime } from '@/hooks/use-employees-realtime';
import { useSession, useWorkOrdersRealtime } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useTheme } from '@/hooks/use-theme';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { isAssignedToWorkOrder, isClaimableWorkOrder, DEFAULT_MAX_ACTIVE_WORK_ORDERS } from '@autocore/rbac';
import { setEmployeeShiftOn } from '@/services/firestore/employee-rbac-service';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import { haptics, rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';

import { ProfileScreenShell } from '../components/profile-screen-shell';

const WEEKDAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function weekDayShortLabel(date: Date): string {
  return WEEKDAY_SHORT_EN[date.getDay()] ?? '';
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildWeekBars(
  completedCountByDay: Map<string, number>,
  endDay: Date,
): OverviewWeekBar[] {
  const bars: OverviewWeekBar[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(endDay);
    day.setDate(day.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const value = completedCountByDay.get(key) ?? 0;
    bars.push({
      label: weekDayShortLabel(day),
      value,
    });
  }
  return bars;
}

type MyEarningsScreenProps = {
  variant?: 'tab' | 'stack';
};

export function MyEarningsScreen({ variant = 'stack' }: MyEarningsScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { uid } = useSession();
  const rbac = useRbacPolicy();
  const allowed = rbac.nav.canAccessMyEarnings;
  const isShiftHub = variant === 'tab';
  const [shiftBusy, setShiftBusy] = useState(false);

  const companyId = allowed ? rbac.companyId : null;
  const { employees } = useEmployeesRealtime(companyId, Boolean(companyId));
  const selfEmployee = useMemo(
    () => employees.find((entry) => entry.uid === uid),
    [employees, uid],
  );
  const shiftOn = selfEmployee?.shiftOn !== false;
  const { payroll } = usePayrollTransactionsRealtime(companyId, {
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });
  const { domainOrders } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const shiftStats = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let myOpen = 0;
    let freePool = 0;
    const completedByDay = new Map<string, number>();

    for (const row of payroll) {
      if (row.status === 'paid') paid += row.amount;
      else if (row.status === 'pending') pending += row.amount;
    }

    const today = new Date();
    for (const order of domainOrders) {
      if (isClaimableWorkOrder(order)) freePool += 1;
      if (uid && isAssignedToWorkOrder(order, uid) && isOpenStatus(order.status)) {
        myOpen += 1;
      }
      if (
        uid &&
        isAssignedToWorkOrder(order, uid) &&
        ['completed', 'delivered'].includes(order.status)
      ) {
        const closedAt = coerceToDate(order.completedAt) ?? coerceToDate(order.updatedAt);
        if (closedAt && closedAt.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
          const key = closedAt.toISOString().slice(0, 10);
          completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
        }
      }
    }

    return {
      pending,
      paid,
      myOpen,
      freePool,
      weekBars: buildWeekBars(completedByDay, today),
    };
  }, [domainOrders, payroll, uid]);

  const freePreview = useMemo(
    () => domainOrders.filter((order) => isClaimableWorkOrder(order)).slice(0, 4),
    [domainOrders],
  );

  const body = useMemo(() => {
    if (!allowed) {
      return (
        <Text variant="body" color="muted">
          This section requires permission to view your own payouts.
        </Text>
      );
    }

    return (
      <View style={{ gap: tokens.space.section }}>
        <SettingsSectionCard title="Shift" description="Get push notifications for open work orders and claim them">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: tokens.space.stack + 2,
              paddingBottom: tokens.space.stack + 2,
              gap: tokens.space.stack,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {shiftOn ? 'On shift' : 'Shift off'}
              </Text>
              <Text variant="caption" color="muted">
                Active work order limit: {DEFAULT_MAX_ACTIVE_WORK_ORDERS}
              </Text>
            </View>
            <Switch
              value={shiftOn}
              disabled={shiftBusy || !companyId || !uid}
              onValueChange={(next) => {
                if (!companyId || !uid) return;
                setShiftBusy(true);
                void setEmployeeShiftOn(companyId, uid, next)
                  .then(() => {
                    haptics.selection();
                    toast({
                      title: next ? 'Shift turned on' : 'Shift turned off',
                      variant: 'success',
                    });
                  })
                  .catch((error) => {
                    haptics.warning();
                    toast({
                      title: 'Could not update shift',
                      description: error instanceof Error ? error.message : undefined,
                      variant: 'destructive',
                    });
                  })
                  .finally(() => setShiftBusy(false));
              }}
            />
          </View>
        </SettingsSectionCard>

        <View style={{ flexDirection: 'row', gap: tokens.space.stack, marginHorizontal: tokens.space.screenX }}>
          {[
            { label: 'My open', value: String(shiftStats.myOpen) },
            { label: 'Open pool', value: String(shiftStats.freePool) },
            { label: 'Pending payout', value: formatMoney(shiftStats.pending) },
          ].map((tile) => (
            <View
              key={tile.label}
              style={{
                flex: 1,
                padding: tokens.space.stack,
                borderRadius: tokens.radius.sheet,
                backgroundColor: colors.card,
                gap: 4,
              }}
            >
              <Text variant="caption" color="muted">
                {tile.label}
              </Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {tile.value}
              </Text>
            </View>
          ))}
        </View>

        <SettingsSectionCard title="Productivity" description="Completed work orders in the last 7 days">
          <View style={{ paddingHorizontal: tokens.space.stack + 2, paddingBottom: tokens.space.stack + 2 }}>
            <McWeekBars bars={shiftStats.weekBars} delay={80} />
          </View>
        </SettingsSectionCard>

        {freePreview.length > 0 ? (
          <SettingsSectionCard title="Open work orders" description="Available to claim">
            <View style={{ paddingHorizontal: tokens.space.stack + 2, paddingBottom: tokens.space.stack + 2, gap: tokens.space.inline }}>
              {freePreview.map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/(tabs)/orders/${order.id}`)}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: tokens.control.hairline,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    #{order.number} · {order.vehicleLabel ?? order.clientName ?? 'Work order'}
                  </Text>
                  <Text variant="caption" color="muted">
                    {order.licensePlate || 'No plate'}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/(tabs)/orders')}>
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  All work orders →
                </Text>
              </Pressable>
            </View>
          </SettingsSectionCard>
        ) : null}

        <View style={{ gap: tokens.space.inline, marginHorizontal: tokens.space.screenX }}>
          <Text
            variant="footnote"
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: colors.mutedForeground,
              marginHorizontal: tokens.space.stack,
            }}
          >
            Earnings
          </Text>
          {payroll.length === 0 ? (
            <Text variant="body" color="muted">
              No earnings yet
            </Text>
          ) : (
            payroll.slice(0, 12).map((row) => {
              const order = domainOrders.find((entry) => entry.id === row.workOrderId);
              return (
                <View
                  key={row.id}
                  style={{
                    padding: tokens.space.stack,
                    borderRadius: tokens.radius.sheet,
                    backgroundColor: colors.card,
                    gap: 4,
                  }}
                >
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {formatMoney(row.amount)} · {row.status}
                  </Text>
                  <Text variant="caption" color="muted">
                    {order ? `Work order #${order.number}` : row.workOrderId}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  }, [
    allowed,
    colors.border,
    colors.card,
    colors.mutedForeground,
    colors.primary,
    domainOrders,
    freePreview,
    payroll,
    router,
    shiftStats.freePool,
    shiftStats.myOpen,
    shiftStats.pending,
    shiftStats.weekBars,
    shiftOn,
    shiftBusy,
    companyId,
    uid,
  ]);

  const title = isShiftHub ? 'Shift' : 'My earnings';
  const subtitle = isShiftHub
    ? 'Your work orders, the open queue, and payouts'
    : allowed
      ? 'Earnings from completed work orders'
      : undefined;

  if (variant === 'tab') {
    return (
      <Screen>
        <PageHeader title={title} subtitle={subtitle} logo={null} align="start" />
        <ScreenScroll tabBarInset contentStyle={{ gap: tokens.space.section, paddingTop: tokens.space.stack }}>
          {body}
        </ScreenScroll>
      </Screen>
    );
  }

  return (
    <ProfileScreenShell title={title} subtitle={subtitle}>
      {body}
    </ProfileScreenShell>
  );
}
