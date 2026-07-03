import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import {
  McAnimatedCounter,
  McAnimatedSparkline,
  mcTimeline,
  useMcEnter,
} from '../animation';
import { mc } from '../layout';
import { McSectionTitle } from './mc-primitives';
import type { MissionControlOverviewMetric, OverviewTrendTone } from '../types';

type McOverviewProps = {
  metrics: MissionControlOverviewMetric[];
};

function trendColor(tone: OverviewTrendTone, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'chart2':
      return colors.chart2;
    case 'muted':
      return colors.mutedForeground;
    default:
      return colors.primary;
  }
}

function overviewCounterFormat(metric: MissionControlOverviewMetric): 'integer' | 'grouped' | 'currency-rub' {
  if (metric.id === 'sales') return 'currency-rub';
  if (metric.id === 'orders' || metric.id === 'reservations') return 'integer';
  return 'grouped';
}

function OverviewColumn({ metric, index }: { metric: MissionControlOverviewMetric; index: number }) {
  const { colors } = useTheme();
  const sparkColor = trendColor(metric.trendTone, colors);
  const delay = mcTimeline.overviewColumnBase + index * mcTimeline.overviewColumnStagger;
  const columnStyle = useMcEnter({
    delay,
    translateY: 18,
    spring: true,
    duration: 360,
  });

  return (
    <Animated.View style={[{ flex: 1, gap: 2 }, columnStyle]}>
      <Text variant="caption" color="muted" style={{ fontSize: mc.label }}>
        {metric.label}
      </Text>
      <McAnimatedCounter
        value={metric.numericValue}
        delay={delay + 80}
        duration={mcTimeline.counterDuration}
        format={overviewCounterFormat(metric)}
        style={{
          fontSize: mc.value,
          fontWeight: '700',
          letterSpacing: -0.2,
          fontVariant: ['tabular-nums'],
          color: colors.foreground,
        }}
      />
      {metric.hint ? (
        <Text
          variant="caption"
          style={{
            fontSize: mc.meta,
            fontWeight: '500',
            color: metric.hintTone === 'success' ? colors.success : colors.mutedForeground,
          }}
        >
          {metric.hint}
        </Text>
      ) : null}
      <View style={{ marginTop: 4 }}>
        <McAnimatedSparkline
          values={metric.trend}
          color={sparkColor}
          delay={delay + mcTimeline.sparklineDelayAfterColumn}
          duration={mcTimeline.sparklineDuration}
        />
      </View>
    </Animated.View>
  );
}

export function McOverview({ metrics }: McOverviewProps) {
  const titleStyle = useMcEnter({
    delay: mcTimeline.overviewTitle,
    translateY: 8,
    duration: 300,
  });

  return (
    <View>
      <Animated.View style={titleStyle}>
        <McSectionTitle title="Обзор" />
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {metrics.map((metric, index) => (
          <OverviewColumn key={metric.id} metric={metric} index={index} />
        ))}
      </View>
    </View>
  );
}
