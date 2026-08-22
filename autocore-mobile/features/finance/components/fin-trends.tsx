import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finFontCap, finType } from '../layout';
import { formatMoneyAdaptive } from '../lib/format';
import { toneColor } from '../lib/tone';
import type { FinanceTrendMetric } from '../lib/trends';
import {
  FinChartLegend,
  FinInlineChart,
  FinSkiaCurveChart,
  chartVariantForTrend,
} from './charts';
import { FinChevron, FinDivider, FinPressable, FinSheet } from './fin-primitives';

const ACCENT: Record<
  FinanceTrendMetric['id'],
  (colors: ReturnType<typeof useTheme>['colors']) => string
> = {
  margin: (colors) => colors.success,
  revenue: (colors) => colors.primary,
  costs: (colors) => colors.foreground,
  cash: (colors) => colors.chart2,
};

const FeaturedTrend = memo(function FeaturedTrend({
  metric,
  comparisonLabel,
  onPress,
}: {
  metric: FinanceTrendMetric;
  comparisonLabel: string;
  onPress: (id: FinanceTrendMetric['id']) => void;
}) {
  const { colors } = useTheme();
  const accent = ACCENT[metric.id](colors);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const drawKey = `${metric.id}:${metric.series.join(',')}`;

  const chartPoints = useMemo(
    () =>
      metric.series.map((value, index) => ({
        label: String(index + 1),
        value,
      })),
    [metric.series],
  );

  return (
    <FinSheet>
      <FinPressable
        onPress={() => onPress(metric.id)}
        haptic="light"
        accessibilityLabel={`${metric.label}, ${metric.value}`}
        accessibilityHint="Opens the full history and how it is calculated"
        style={{ paddingHorizontal: fin.stack, paddingTop: fin.stack, paddingBottom: fin.stack - 4 }}
      >
        <View style={{ gap: fin.stack - 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
            <Text
              numberOfLines={1}
              style={{ ...finType.rowTitle, fontWeight: '600', color: accent, flex: 1 }}
            >
              {metric.label}
            </Text>
            {metric.delta ? (
              <Text
                style={{
                  ...finType.rowMeta,
                  fontWeight: '600',
                  color: toneColor(metric.deltaTone, colors),
                }}
              >
                {metric.deltaDirection === 'up' ? '↑ ' : metric.deltaDirection === 'down' ? '↓ ' : ''}
                {metric.delta}
              </Text>
            ) : null}
            <FinChevron />
          </View>

          <Text style={{ ...finType.rowMeta, color: colors.foreground }}>{metric.meaning}</Text>
        </View>
      </FinPressable>

      <FinDivider inset={fin.stack} />

      <View style={{ paddingHorizontal: fin.stack, paddingBottom: fin.stack, gap: fin.stack }}>
        <FinChartLegend
          columns={[
            {
              label: 'Now',
              value: metric.value,
              dotColor: accent,
              valueColor: colors.foreground,
            },
            {
              label: metric.deltaCaption || comparisonLabel,
              value: metric.delta ?? '—',
              dotColor: colors.mutedForeground,
            },
          ]}
        />

        <FinSkiaCurveChart
          points={chartPoints}
          drawKey={drawKey}
          activeIndex={activeIndex}
          onScrub={setActiveIndex}
          hasData={metric.series.length > 1}
          color={accent}
          height={148}
        />
      </View>
    </FinSheet>
  );
});

const SupportingTrend = memo(function SupportingTrend({
  metric,
  onPress,
}: {
  metric: FinanceTrendMetric;
  onPress: (id: FinanceTrendMetric['id']) => void;
}) {
  const { colors } = useTheme();
  const accent = ACCENT[metric.id](colors);
  const variant = chartVariantForTrend(metric.id);
  const gaugeShare = metric.id === 'margin' ? metric.series[metric.series.length - 1] : undefined;

  return (
    <FinSheet>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} />
            <Text style={{ ...finType.rowMeta, fontWeight: '600', color: accent }} numberOfLines={1}>
              {metric.label}
            </Text>
          </View>
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

        <FinInlineChart
          values={metric.series}
          color={accent}
          variant={variant}
          gaugeShare={gaugeShare}
        />
        <FinChevron />
      </FinPressable>
    </FinSheet>
  );
});

/**
 * Trend cards — one featured chart in a container, supporting metrics each in
 * their own sheet with a distinct inline shape.
 */
export function FinTrends({
  metrics,
  comparisonLabel,
  onSelect,
}: {
  metrics: FinanceTrendMetric[];
  comparisonLabel: string;
  onSelect: (id: FinanceTrendMetric['id']) => void;
}) {
  const featured =
    metrics.find((metric) => metric.series.length > 1 && metric.id === 'margin') ??
    metrics.find((metric) => metric.series.length > 1) ??
    null;
  const rest = metrics.filter((metric) => metric.id !== featured?.id);

  return (
    <View style={{ gap: fin.stack }}>
      {featured ? (
        <FeaturedTrend
          metric={featured}
          comparisonLabel={comparisonLabel}
          onPress={onSelect}
        />
      ) : null}
      {rest.map((metric) => (
        <SupportingTrend key={metric.id} metric={metric} onPress={onSelect} />
      ))}
    </View>
  );
}
