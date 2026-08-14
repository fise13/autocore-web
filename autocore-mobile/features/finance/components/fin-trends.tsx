import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finFontCap, finType } from '../layout';
import { toneColor } from '../lib/tone';
import type { FinanceTrendMetric } from '../lib/trends';
import { FinChevron, FinDivider, FinPressable, FinSheet } from './fin-primitives';
import { FinSparkline } from './fin-sparkline';

/**
 * Trend rows. Value first, change second, shape third — the same read order on
 * every row, so the eye can run down the column without re-parsing each one.
 */
const TrendRow = memo(function TrendRow({
  metric,
  onPress,
}: {
  metric: FinanceTrendMetric;
  onPress: (id: FinanceTrendMetric['id']) => void;
}) {
  const { colors } = useTheme();
  const sparkColor =
    metric.chartColor === 'primary'
      ? colors.primary
      : metric.chartColor === 'foreground'
        ? colors.mutedForeground
        : toneColor(metric.deltaTone, colors);

  return (
    <FinPressable
      onPress={() => onPress(metric.id)}
      haptic="light"
      accessibilityLabel={`${metric.label}, ${metric.value}${metric.delta ? `, ${metric.delta}` : ''}`}
      accessibilityHint="Opens the full history and how it is calculated"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: fin.stack,
        paddingHorizontal: fin.stack,
        paddingVertical: fin.stack - 2,
        minHeight: 64,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={finType.rowMeta} color="muted" numberOfLines={1}>
          {metric.label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: fin.inline }}>
          <Text
            style={{ ...finType.metric, fontSize: 22, lineHeight: 27, color: colors.foreground }}
            maxFontSizeMultiplier={finFontCap.metric}
            numberOfLines={1}
          >
            {metric.value}
          </Text>
          {metric.delta ? (
            <Text
              style={{
                ...finType.rowMeta,
                fontWeight: '600',
                color: toneColor(metric.deltaTone, colors),
              }}
              numberOfLines={1}
            >
              {metric.deltaDirection === 'up' ? '↑ ' : metric.deltaDirection === 'down' ? '↓ ' : ''}
              {metric.delta}
            </Text>
          ) : null}
        </View>
      </View>

      <FinSparkline values={metric.series} color={sparkColor} />
      <FinChevron />
    </FinPressable>
  );
});

export function FinTrends({
  metrics,
  onSelect,
}: {
  metrics: FinanceTrendMetric[];
  onSelect: (id: FinanceTrendMetric['id']) => void;
}) {
  return (
    <FinSheet>
      {metrics.map((metric, index) => (
        <View key={metric.id}>
          {index > 0 ? <FinDivider /> : null}
          <TrendRow metric={metric} onPress={onSelect} />
        </View>
      ))}
    </FinSheet>
  );
}
