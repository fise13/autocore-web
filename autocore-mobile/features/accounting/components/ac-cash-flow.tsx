import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { buildSparklinePoints, sanitizeChartSeries } from '@/lib/charts/sparkline-points';
import { autocoreEase } from '@/theme/motion';
import { useMcEnter } from '@/features/mission-control/animation';

import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';
import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import type { AccountingSnapshot, CashFlowPeriod } from '../types';

const PERIOD_OPTIONS: Array<{ value: CashFlowPeriod; label: string }> = [
  { value: '7d', label: '7Д' },
  { value: '30d', label: '30Д' },
  { value: '90d', label: '90Д' },
  { value: 'year', label: 'Год' },
];

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

function buildLine(values: number[], width: number, height: number): string {
  return buildSparklinePoints(sanitizeChartSeries(values), width, height, 8);
}

function AnimatedLine({
  values,
  color,
  width,
  height,
  delay,
}: {
  values: number[];
  color: string;
  width: number;
  height: number;
  delay: number;
}) {
  const reduced = useReducedMotion();
  const points = useMemo(() => buildLine(values, width, height), [values, width, height]);
  const length = useMemo(() => {
    const pairs = points.split(' ').map((p) => p.split(',').map(Number));
    let total = 0;
    for (let i = 1; i < pairs.length; i += 1) {
      total += Math.hypot(pairs[i][0] - pairs[i - 1][0], pairs[i][1] - pairs[i - 1][1]);
    }
    return total;
  }, [points]);
  const offset = useSharedValue(reduced ? 0 : length);

  useEffect(() => {
    if (reduced) {
      offset.value = 0;
      return;
    }
    offset.value = length;
    offset.value = withDelay(delay, withTiming(0, { duration: 700, easing: autocoreEase }));
  }, [delay, length, offset, reduced, values]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
    strokeDasharray: [length, length],
  }));

  return (
    <AnimatedPolyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

type AcCashFlowProps = {
  data: AccountingSnapshot['cashFlow'];
};

export function AcCashFlow({ data }: AcCashFlowProps) {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<CashFlowPeriod>('30d');
  const series = data[period];
  const chartWidth = 320;
  const chartHeight = 120;
  const cardStyle = useMcEnter({ delay: acTimeline.cashFlow, translateY: 16, spring: true, duration: 380 });

  return (
    <Animated.View
      style={[
        {
          borderRadius: ac.cardRadius,
          borderWidth: ac.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 16,
          gap: 14,
        },
        cardStyle,
      ]}
    >
      <Text variant="body" style={{ fontSize: ac.sectionTitle, fontWeight: '700', letterSpacing: -0.2 }}>
        Денежный поток
      </Text>

      <ProfileSegmentedControl value={period} onChange={setPeriod} options={PERIOD_OPTIONS} delay={0} />

      <View style={{ alignItems: 'center' }}>
        <Svg width={chartWidth} height={chartHeight}>
          <AnimatedLine
            values={series.revenue}
            color={colors.primary}
            width={chartWidth}
            height={chartHeight}
            delay={acTimeline.cashFlow + 80}
          />
          <AnimatedLine
            values={series.expenses}
            color={colors.destructive}
            width={chartWidth}
            height={chartHeight}
            delay={acTimeline.cashFlow + 140}
          />
          <AnimatedLine
            values={series.profit}
            color={colors.success}
            width={chartWidth}
            height={chartHeight}
            delay={acTimeline.cashFlow + 200}
          />
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
        {[
          { label: 'Выручка', color: colors.primary },
          { label: 'Расходы', color: colors.destructive },
          { label: 'Прибыль', color: colors.success },
        ].map((legend) => (
          <View key={legend.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: legend.color }} />
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
              {legend.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
