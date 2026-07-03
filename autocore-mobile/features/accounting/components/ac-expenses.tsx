import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { AcSectionTitle } from './ac-primitives';
import { formatKzt } from '../utils/format';
import type { AccountingSnapshot } from '../types';

type AcExpensesProps = {
  items: AccountingSnapshot['expenses'];
};

function ExpenseRow({
  category,
  index,
  isLast,
}: {
  category: AccountingSnapshot['expenses'][number];
  index: number;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const Icon = category.icon;
  const delay = acTimeline.expenses + 30 + index * 35;
  const rowStyle = useMcEnter({ delay, translateY: 10, duration: 300 });

  return (
    <Animated.View style={rowStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 8,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <Icon size="sm" color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
              {category.label}
            </Text>
            <Text variant="caption" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatKzt(category.amount, true)}
            </Text>
          </View>
          <View style={{ height: 4, borderRadius: 999, backgroundColor: colors.muted, overflow: 'hidden' }}>
            <View
              style={{
                width: `${category.pct}%`,
                height: '100%',
                backgroundColor: colors.primary,
                borderRadius: 999,
                opacity: 0.85,
              }}
            />
          </View>
        </View>
        <Text variant="caption" color="muted" style={{ fontWeight: '600', minWidth: 28, textAlign: 'right' }}>
          {category.pct}%
        </Text>
      </View>
      {!isLast ? (
        <View style={{ height: ac.hairline, backgroundColor: colors.border, marginLeft: 56 }} />
      ) : null}
    </Animated.View>
  );
}

export function AcExpenses({ items }: AcExpensesProps) {
  const { colors } = useTheme();
  const titleStyle = useMcEnter({ delay: acTimeline.expenses, translateY: 8, duration: 300 });

  return (
    <View style={{ gap: 10 }}>
      <Animated.View style={titleStyle}>
        <AcSectionTitle title="Расходы по категориям" />
      </Animated.View>
      <View
        style={{
          borderRadius: ac.cardRadius,
          borderWidth: ac.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 8,
          gap: 4,
        }}
      >
        {items.map((category, index) => (
          <ExpenseRow
            key={category.id}
            category={category}
            index={index}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}
