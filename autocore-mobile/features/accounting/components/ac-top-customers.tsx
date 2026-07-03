import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { AcSectionTitle } from './ac-primitives';
import { formatKzt, formatPct } from '../utils/format';
import type { AccountingSnapshot } from '../types';

type AcTopCustomersProps = {
  items: AccountingSnapshot['topCustomers'];
};

export function AcTopCustomers({ items }: AcTopCustomersProps) {
  const { colors } = useTheme();
  const titleStyle = useMcEnter({ delay: acTimeline.customers, translateY: 8, duration: 300 });

  return (
    <View style={{ gap: 10 }}>
      <Animated.View style={titleStyle}>
        <AcSectionTitle title="Топ клиенты" />
      </Animated.View>
      {items.map((customer, index) => {
        const delay = acTimeline.customers + 40 + index * 45;
        const cardStyle = useMcEnter({ delay, translateY: 12, spring: true, duration: 320 });
        const growthColor = customer.growthPct >= 0 ? colors.success : colors.destructive;

        return (
          <Animated.View
            key={customer.id}
            style={[
              {
                borderRadius: ac.cardRadius,
                borderWidth: ac.hairline,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: 16,
                gap: 8,
              },
              cardStyle,
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" style={{ fontSize: 15, fontWeight: '700' }}>
                {customer.name}
              </Text>
              <Text variant="caption" style={{ fontWeight: '700', color: growthColor }}>
                {formatPct(customer.growthPct)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
                  Оплачено
                </Text>
                <Text variant="caption" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatKzt(customer.paid, true)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
                  Долг
                </Text>
                <Text variant="caption" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatKzt(customer.outstanding, true)}
                </Text>
              </View>
              <View style={{ gap: 2 }}>
                <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
                  Счетов
                </Text>
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  {customer.invoices}
                </Text>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
