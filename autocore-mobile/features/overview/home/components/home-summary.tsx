import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { formatMoneyCompact } from '@/features/finance/lib/format';
import { useTheme } from '@/hooks';
import { typography } from '@/theme';

import type { HomeMetric } from '../types';
import { HomeMetricChart } from './home-metric-chart';
import { metricAccentColor, MetricGlyph } from './home-metric-style';
import { HomeSparkline } from './home-chart';
import {
  home,
  homeFontCap,
  HomeChevron,
  HomeDelta,
  HomeDivider,
  HomeRow,
  HomeSection,
  HomeSurface,
  type HomeDeltaTone,
} from './home-primitives';

type HomeSummaryProps = {
  /** Ranked. Index 0 leads — which metric that is, is the ranking's decision. */
  metrics: HomeMetric[];
  note: string | null;
  ready: boolean;
  onOpen: (metric: HomeMetric) => void;
  onOpenWork: () => void;
};

function formatValue(metric: HomeMetric): string {
  if (metric.value === null) return '—';
  if (metric.unit === 'currency') return formatMoneyCompact(metric.value);
  return metric.displayValue ?? String(metric.value);
}

/** The unit that trails the number, Health-style. Currency carries its own. */
function unitLabel(metric: HomeMetric): string | null {
  if (metric.unit !== 'count' || metric.value === null) return null;
  const one = Math.abs(metric.value) === 1;
  switch (metric.family) {
    case 'orders':
      return one ? 'order' : 'orders';
    case 'engines':
      return one ? 'engine' : 'engines';
    case 'parts':
      return one ? 'part' : 'parts';
    case 'intake':
      return one ? 'engine' : 'engines';
    default:
      return one ? 'job' : 'jobs';
  }
}

/** Welcome or unwelcome, judged by what the metric is — not by which way it moved. */
function deltaTone(metric: HomeMetric, percent: number): HomeDeltaTone {
  if (metric.polarity === 'neutral') return 'neutral';
  const rising = percent > 0;
  const good = metric.polarity === 'higher_better' ? rising : !rising;
  return good ? 'positive' : 'negative';
}

function describe(metric: HomeMetric, value: string): string {
  const percent = metric.comparison?.deltaPercent;
  return [
    metric.title,
    value,
    metric.periodLabel,
    percent !== null && percent !== undefined
      ? `${percent > 0 ? 'up' : 'down'} ${Math.abs(percent)} percent`
      : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * The metric the ranking put first.
 *
 * Its emphasis is a consequence, not a layout decision: whatever wins gets the
 * display numeral, the explanation and — when the series actually moves — the
 * full-width chart. Nothing about this block assumes it will be money.
 */
const FeaturedMetric = memo(function FeaturedMetric({
  metric,
  onPress,
}: {
  metric: HomeMetric;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const value = formatValue(metric);
  const unit = unitLabel(metric);
  const percent = metric.comparison?.deltaPercent ?? null;
  const accent = metricAccentColor(metric, colors);
  const showChart = metric.trendSeries !== null && metric.trendSeries.length > 1;

  return (
    <HomeRow
      accessibilityLabel={describe(metric, value)}
      accessibilityHint={metric.destination ? 'Opens the full breakdown' : undefined}
      onPress={metric.destination ? onPress : undefined}
      style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.block }}
    >
      <View style={{ gap: home.stack }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: home.inline,
          }}
        >
          <MetricGlyph id={metric.id} size={16} color={accent} />
          <Text
            variant="subheadline"
            numberOfLines={1}
            style={{ fontWeight: '600', color: accent, flex: 1, minWidth: 0 }}
          >
            {metric.title}
          </Text>
          <Text variant="caption1" color="muted" numberOfLines={1}>
            {metric.periodLabel}
          </Text>
          {metric.destination ? <HomeChevron /> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: home.micro + 2 }}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={homeFontCap.hero}
            style={{
              ...typography.largeTitle,
              fontVariant: ['tabular-nums'],
              color: colors.foreground,
            }}
          >
            {value}
          </Text>
          {unit ? (
            <Text variant="callout" color="muted" numberOfLines={1}>
              {unit}
            </Text>
          ) : null}
          {percent !== null ? (
            <View style={{ marginLeft: home.micro }}>
              <HomeDelta
                percent={percent}
                tone={deltaTone(metric, percent)}
                accessibilityLabel={`${percent > 0 ? 'Up' : 'Down'} ${Math.abs(percent)} percent ${metric.comparison?.label ?? ''}`}
              />
            </View>
          ) : null}
        </View>

        {metric.note ? (
          <Text variant="footnote" color="muted">
            {metric.note}
          </Text>
        ) : null}

        {showChart ? (
          <>
            <HomeDivider inset={0} />
            <HomeSparkline points={metric.trendSeries ?? []} height={56} color={accent} />
          </>
        ) : null}
      </View>
    </HomeRow>
  );
});

/**
 * A supporting metric, laid out like a Health favourite: glyph and name above
 * the number, the window it belongs to on the right, and its own series beside
 * the value. Each row carries its own period, which is why Home needs no global
 * range control.
 */
const CompactMetric = memo(function CompactMetric({
  metric,
  onPress,
}: {
  metric: HomeMetric;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const value = formatValue(metric);
  const unit = unitLabel(metric);
  const percent = metric.comparison?.deltaPercent ?? null;
  const accent = metricAccentColor(metric, colors);

  return (
    <HomeRow
      accessibilityLabel={describe(metric, value)}
      accessibilityHint={metric.destination ? 'Opens the full breakdown' : undefined}
      onPress={metric.destination ? onPress : undefined}
      style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.stack }}
    >
      <View style={{ gap: home.inline }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.inline }}>
          <MetricGlyph id={metric.id} size={14} color={accent} />
          <Text
            variant="footnote"
            numberOfLines={1}
            style={{ fontWeight: '600', color: accent, flex: 1, minWidth: 0 }}
          >
            {metric.title}
          </Text>
          <Text variant="caption1" color="muted" numberOfLines={1}>
            {metric.periodLabel}
          </Text>
          {metric.destination ? <HomeChevron /> : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: home.stack,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: home.micro + 1,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={homeFontCap.metric}
              style={{
                ...typography.title2,
                fontVariant: ['tabular-nums'],
                color: colors.foreground,
              }}
            >
              {value}
            </Text>
            {unit ? (
              <Text variant="footnote" color="muted" numberOfLines={1}>
                {unit}
              </Text>
            ) : null}
            {percent !== null ? (
              <HomeDelta percent={percent} tone={deltaTone(metric, percent)} size="sm" />
            ) : null}
          </View>

          <HomeMetricChart points={metric.trendSeries} color={accent} />
        </View>
      </View>
    </HomeRow>
  );
});

/**
 * Summary — the answer to "what is most important about my business right now?"
 *
 * Not a financial summary and not a KPI grid: a ranked brief where the leading
 * metric is whatever currently deserves the space.
 */
export const HomeSummary = memo(function HomeSummary({
  metrics,
  note,
  ready,
  onOpen,
  onOpenWork,
}: HomeSummaryProps) {
  const handleOpen = useCallback((metric: HomeMetric) => () => onOpen(metric), [onOpen]);

  if (metrics.length === 0) {
    if (!ready) return null;
    return (
      <HomeSection title="Summary">
        <HomeSurface padded style={{ gap: home.inline }}>
          <Text variant="callout" style={{ fontWeight: '500' }}>
            Nothing to summarise yet
          </Text>
          <Text variant="footnote" color="muted">
            {note ??
              'Once orders, stock or transactions start moving, the metrics that matter will appear here.'}
          </Text>
          <Text
            variant="footnote"
            color="accent"
            style={{ fontWeight: '500', marginTop: home.micro }}
            accessibilityRole="link"
            onPress={onOpenWork}
          >
            Open Work
          </Text>
        </HomeSurface>
      </HomeSection>
    );
  }

  const [featured, ...rest] = metrics;

  return (
    <HomeSection title="Summary">
      <HomeSurface>
        <FeaturedMetric metric={featured} onPress={handleOpen(featured)} />
        {rest.map((metric) => (
          <View key={metric.id}>
            <HomeDivider />
            <CompactMetric metric={metric} onPress={handleOpen(metric)} />
          </View>
        ))}
      </HomeSurface>

      {note ? (
        <Text variant="footnote" color="muted" style={{ paddingHorizontal: home.pad }}>
          {note}
        </Text>
      ) : null}
    </HomeSection>
  );
});
