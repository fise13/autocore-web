import { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated from 'react-native-reanimated';

import { LineChart } from '@/components/charts/line-chart';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm, tokens } from '@/theme';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import { insightChartIsUseful } from '../lib/insight-chart';
import { mc } from '../layout';
import type { OverviewInsight } from '../types';

type McFeaturedInsightProps = {
  insight: OverviewInsight | null;
};

function toneAccent(
  tone: OverviewInsight['tone'],
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (tone === 'positive') return colors.success;
  if (tone === 'warning') return colors.warning;
  return colors.primary;
}

/**
 * Apple Health–style insight card:
 * tinted category header · narrative · optional compare · chart only when useful.
 */
export const McFeaturedInsight = memo(function McFeaturedInsight({
  insight,
}: McFeaturedInsightProps) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const enterStyle = useMcEnter({ delay: mcTimeline.featuredInsight, translateY: 6 });

  const accent = insight ? toneAccent(insight.tone, colors) : colors.primary;
  const narrative = insight?.insight || insight?.body || insight?.detail || '';
  const showChart = insightChartIsUseful(insight?.chart);
  const chartPoints = useMemo(
    () =>
      (insight?.chart?.points ?? []).map((p, i) => ({
        x: i,
        y: p.value,
        label: p.label,
      })),
    [insight?.chart?.points],
  );

  const navigate = useCallback(() => {
    if (!insight?.route) return;
    haptics.light();
    if (insight.routeParams) {
      navigateTab({ pathname: insight.route, params: insight.routeParams });
      return;
    }
    navigateTab(insight.route);
  }, [insight, navigateTab]);

  if (!insight) return null;

  return (
    <Animated.View style={[{ gap: tokens.space[2.5] }, enterStyle]}>
      <Text
        style={{
          fontSize: 28,
          lineHeight: 34,
          fontWeight: '700',
          letterSpacing: -0.45,
          color: colors.foreground,
        }}
      >
        AI insights
      </Text>

      <McPressable
        accessibilityRole="button"
        disabled={!insight.route}
        onPress={navigate}
        style={{
          backgroundColor: colors.card,
          borderRadius: mc.cardRadius,
          padding: tokens.space[4],
          gap: tokens.space[3],
        }}
      >
        {/* Health header: tinted glyph + category · chevron */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.space[2],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <SymbolView
              name={(insight.sf || 'sparkles') as 'sparkles'}
              size={15}
              tintColor={accent}
              weight="semibold"
            />
            <Text
              variant="subheadline"
              numberOfLines={1}
              style={{ fontWeight: '600', color: accent, flexShrink: 1 }}
            >
              {insight.category}
            </Text>
          </View>
          {insight.route ? (
            <SymbolView
              name="chevron.right"
              size={11}
              tintColor={colors.mutedForeground}
              weight="semibold"
            />
          ) : null}
        </View>

        {/* Narrative takeaway */}
        <Text variant="callout" style={{ fontWeight: '500', color: colors.foreground }}>
          {narrative}
        </Text>

        {/* Dual metrics — Health “Today / Average” */}
        {insight.compare ? (
          <View style={{ flexDirection: 'row', gap: rhythm.section, marginTop: tokens.space.micro }}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: accent,
                  }}
                />
                <Text variant="footnote" color="muted">
                  {insight.compare.primary.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 34,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                  fontVariant: ['tabular-nums'],
                  color: accent,
                }}
              >
                {insight.compare.primary.value}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: colors.mutedForeground,
                    opacity: 0.55,
                  }}
                />
                <Text variant="footnote" color="muted">
                  {insight.compare.secondary.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 34,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                  fontVariant: ['tabular-nums'],
                  color: colors.mutedForeground,
                }}
              >
                {insight.compare.secondary.value}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Chart — only when the series answers the insight */}
        {showChart && insight.chart ? (
          <View style={{ gap: tokens.space[2], marginTop: tokens.space.micro }}>
            <LineChart
              question={insight.category}
              hideQuestion
              showArea
              height={100}
              seriesColor={accent}
              points={chartPoints}
            />
            {(insight.chart.baselineLabel || insight.chart.currentLabel) && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: tokens.space[3],
                  paddingHorizontal: 2,
                }}
              >
                {insight.chart.baselineLabel ? (
                  <Text variant="caption2" color="muted">
                    {insight.chart.baselineLabel}
                    {insight.chart.baseline != null
                      ? ` · ${Math.round(insight.chart.baseline)}`
                      : ''}
                  </Text>
                ) : null}
                {insight.chart.currentLabel ? (
                  <Text variant="caption2" style={{ color: accent, fontWeight: '600' }}>
                    {insight.chart.currentLabel}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {insight.cta ? (
          <Text
            variant="subheadline"
            style={{ color: accent, fontWeight: '600', marginTop: tokens.space.micro }}
          >
            {insight.cta}
          </Text>
        ) : null}
      </McPressable>
    </Animated.View>
  );
});
