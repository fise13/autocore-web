import { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { SegmentedControl, Text } from '@/components/ui';
import { formatMoneyCompact } from '@/features/finance/lib/format';
import { useTheme } from '@/hooks';

import { HOME_PERIOD_IDS, HOME_PERIOD_LABELS } from '../lib/period';
import type { HomePeriod, HomePeriodId, HomeTrend } from '../types';
import { HomeMetricChart } from './home-metric-chart';
import { MetricGlyph } from './home-metric-style';
import { HomeTrendChart } from './home-trend-chart';
import {
  home,
  HomeChevron,
  HomeDelta,
  HomeDivider,
  HomeRow,
  HomeSection,
  HomeSurface,
  type HomeDeltaTone,
} from './home-primitives';

const COUNT_FORMAT = new Intl.NumberFormat('en-US');

function toneOf(trend: HomeTrend): HomeDeltaTone {
  if (trend.tone === 'positive') return 'positive';
  if (trend.tone === 'negative') return 'negative';
  return 'neutral';
}

function formatterFor(trend: HomeTrend): (value: number) => string {
  return trend.unit === 'currency'
    ? formatMoneyCompact
    : (value: number) => COUNT_FORMAT.format(Math.round(value));
}

/**
 * The lead trend gets room to show its shape.
 *
 * A pattern is the whole reason this section exists, and a pattern squeezed into
 * a 30pt sparkline is decoration. One chart at full width, scrubable, with the
 * sentence that says what it means.
 */
const FeaturedTrend = memo(function FeaturedTrend({
  trend,
  period,
  onPress,
}: {
  trend: HomeTrend;
  period: HomePeriod;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const percent = trend.deltaPercent;
  const tone = toneOf(trend);
  const color =
    tone === 'positive' ? colors.success : tone === 'negative' ? colors.warning : colors.primary;

  const drawKey = useMemo(
    () => `${trend.id}:${period.id}:${(trend.series ?? []).map((point) => point.value).join(',')}`,
    [period.id, trend.id, trend.series],
  );

  const format = formatterFor(trend);

  return (
    <HomeSurface>
      <HomeRow
        accessibilityLabel={`${trend.title}. ${trend.explanation}`}
        accessibilityHint={trend.destination ? 'Opens the full breakdown' : undefined}
        onPress={trend.destination ? onPress : undefined}
        style={{ paddingHorizontal: home.rowPadX, paddingTop: home.block, paddingBottom: home.stack }}
      >
        <View style={{ gap: home.stack }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.inline }}>
            <MetricGlyph id={trend.metricId} size={16} color={color} />
            <Text
              variant="subheadline"
              numberOfLines={1}
              style={{ fontWeight: '600', color, flex: 1, minWidth: 0 }}
            >
              {trend.title}
            </Text>
            {percent !== null ? <HomeDelta percent={percent} tone={tone} /> : null}
            {trend.destination ? <HomeChevron /> : null}
          </View>

          <Text variant="callout" style={{ fontWeight: '500' }}>
            {trend.explanation}
          </Text>
        </View>
      </HomeRow>

      <HomeDivider inset={home.rowPadX} />

      <View
        style={{
          paddingHorizontal: home.rowPadX,
          paddingTop: home.stack,
          paddingBottom: home.stack,
        }}
      >
        {/* Legend first, chart second — the reader learns what the two marks
            mean before being asked to read them. */}
        <View style={{ flexDirection: 'row', gap: home.block }}>
          <LegendColumn
            label="This period"
            value={format(trend.values.current)}
            dotColor={color}
            valueColor={color}
          />
          {trend.values.previous !== null ? (
            <LegendColumn
              label="Previous"
              value={format(trend.values.previous)}
              dotColor={colors.mutedForeground}
            />
          ) : null}
        </View>

        <HomeTrendChart
          points={trend.series ?? []}
          drawKey={drawKey}
          color={color}
          formatValue={format}
          idleLabel={period.longLabel}
          baseline={trend.values.baseline}
        />
      </View>
    </HomeSurface>
  );
});

/** One side of the two-column legend above a trend chart. */
function LegendColumn({
  label,
  value,
  dotColor,
  valueColor,
}: {
  label: string;
  value: string;
  dotColor: string;
  valueColor?: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.micro + 1 }}>
        <View
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotColor }}
        />
        <Text variant="caption1" style={{ color: valueColor ?? colors.mutedForeground }}>
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 20,
          lineHeight: 25,
          fontWeight: '600',
          letterSpacing: -0.3,
          fontVariant: ['tabular-nums'],
          color: valueColor ?? colors.mutedForeground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Anything after the lead keeps the same anatomy at a smaller scale: glyph,
 * sentence, and its own series. Only the lead gets a scrubable full-width chart
 * — two of those stacked would be two things competing to be looked at first.
 */
const SupportingTrend = memo(function SupportingTrend({
  trend,
  onPress,
}: {
  trend: HomeTrend;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const percent = trend.deltaPercent;
  const tone = toneOf(trend);
  const color =
    tone === 'positive' ? colors.success : tone === 'negative' ? colors.warning : colors.primary;

  return (
    <HomeSurface>
      <HomeRow
        accessibilityLabel={`${trend.title}. ${trend.explanation}`}
        accessibilityHint={trend.destination ? 'Opens the full breakdown' : undefined}
        onPress={trend.destination ? onPress : undefined}
        style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.stack }}
      >
        <View style={{ gap: home.inline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.inline }}>
            <MetricGlyph id={trend.metricId} size={14} color={color} />
            <Text
              variant="footnote"
              numberOfLines={1}
              style={{ fontWeight: '600', color, flex: 1, minWidth: 0 }}
            >
              {trend.title}
            </Text>
            {percent !== null ? <HomeDelta percent={percent} tone={tone} size="sm" /> : null}
            {trend.destination ? <HomeChevron /> : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: home.stack,
            }}
          >
            <Text variant="footnote" color="muted" style={{ flex: 1, minWidth: 0 }}>
              {trend.explanation}
            </Text>
            <HomeMetricChart points={trend.series} color={color} />
          </View>
        </View>
      </HomeRow>
    </HomeSurface>
  );
});

type HomeTrendsProps = {
  trends: HomeTrend[];
  period: HomePeriod;
  onPeriodChange: (period: HomePeriodId) => void;
  onOpen: (trend: HomeTrend) => void;
  /** Trends can be empty while the range control still needs to be reachable. */
  available: boolean;
};

/**
 * Trends — what changed, and whether it matters.
 *
 * The range control lives here rather than at the top of Home because this is
 * the only thing it governs. Summary metrics keep their own natural periods and
 * print them on every row.
 */
export const HomeTrends = memo(function HomeTrends({
  trends,
  period,
  onPeriodChange,
  onOpen,
  available,
}: HomeTrendsProps) {
  const handleOpen = useCallback((trend: HomeTrend) => () => onOpen(trend), [onOpen]);
  const handlePeriod = useCallback(
    (value: string) => onPeriodChange(value as HomePeriodId),
    [onPeriodChange],
  );

  const segments = useMemo(
    () => HOME_PERIOD_IDS.map((id) => ({ value: id, label: HOME_PERIOD_LABELS[id] })),
    [],
  );

  // Nothing to compare against at all — the section would be a control and a
  // shrug, so it is not rendered.
  if (!available) return null;

  /**
   * The lead is the first trend that can actually draw its shape.
   *
   * A chart frame around a metric with no usable series is 200pt of empty
   * canvas asserting that something is there — so a trend without a series
   * stays a row, and a trend with one is promoted past it.
   */
  const featured = trends.find((trend) => trend.series !== null && trend.series.length > 1) ?? null;
  const rest = trends.filter((trend) => trend.id !== featured?.id);

  return (
    <HomeSection title="Trends">
      <View style={{ paddingHorizontal: home.pad }}>
        <SegmentedControl
          segments={segments}
          value={period.id}
          onValueChange={handlePeriod}
          accessibilityLabel="Trend period"
        />
      </View>

      {trends.length > 0 ? (
        <View style={{ gap: home.stack }}>
          {featured ? (
            <FeaturedTrend trend={featured} period={period} onPress={handleOpen(featured)} />
          ) : null}
          {rest.map((trend) => (
            <SupportingTrend key={trend.id} trend={trend} onPress={handleOpen(trend)} />
          ))}
        </View>
      ) : (
        <HomeSurface padded>
          <Text variant="footnote" color="muted">
            {`No notable change over the ${period.longLabel.toLowerCase()}.`}
          </Text>
        </HomeSurface>
      )}
    </HomeSection>
  );
});
