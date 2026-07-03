import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { McAnimatedCounter, McAnimatedSparkline, useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { formatKzt } from '../utils/format';
import type { AccountingSnapshot } from '../types';

type AcBalanceHeroProps = {
  balance: AccountingSnapshot['balance'];
};

export function AcBalanceHero({ balance }: AcBalanceHeroProps) {
  const { colors, isDark } = useTheme();
  const growing = balance.growing;
  const chartColor = growing ? colors.success : colors.destructive;

  const cardStyle = useMcEnter({
    delay: acTimeline.hero,
    translateY: 20,
    scaleFrom: 0.98,
    spring: true,
    duration: 420,
  });

  const rows = [
    { label: 'Доступно', value: balance.available },
    { label: 'Выручка', value: balance.monthlyRevenue },
    { label: 'Расходы', value: balance.monthlyExpenses },
    { label: 'Прибыль', value: balance.profit, accent: true },
  ];

  return (
    <Animated.View style={cardStyle}>
      <LinearGradient
        colors={
          isDark
            ? [toneBackground(colors.primary, 0.28), toneBackground(colors.primary, 0.08)]
            : [toneBackground(colors.primary, 0.14), toneBackground(colors.primary, 0.04)]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: ac.heroRadius,
          borderWidth: ac.hairline,
          borderColor: toneBackground(colors.primary, 0.2),
          padding: 20,
          gap: 18,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            <Text variant="caption" style={{ fontWeight: '600', color: colors.primary, fontSize: ac.label }}>
              Финансовый обзор
            </Text>
            <Text variant="caption" color="muted">
              {growing ? 'Рост за месяц' : 'Снижение за месяц'}
            </Text>
          </View>
          <McAnimatedSparkline
            values={balance.trend}
            color={chartColor}
            delay={acTimeline.hero + 120}
            duration={acTimeline.sparklineDuration}
            width={88}
            height={32}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {rows.map((row) => (
            <View key={row.label} style={{ width: '46%', gap: 4 }}>
              <Text variant="caption" color="muted" style={{ fontSize: ac.label }}>
                {row.label}
              </Text>
              <McAnimatedCounter
                value={row.value}
                delay={acTimeline.hero + 80}
                duration={acTimeline.counterDuration}
                format="grouped"
                style={{
                  fontSize: row.accent ? 17 : 15,
                  fontWeight: row.accent ? '800' : '700',
                  fontVariant: ['tabular-nums'],
                  color: row.accent ? colors.primary : colors.foreground,
                  letterSpacing: -0.2,
                }}
              />
              <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
                {formatKzt(row.value, true)}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
