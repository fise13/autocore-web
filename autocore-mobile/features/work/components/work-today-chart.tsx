import { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import type { WorkTodayTrend } from '../lib/work-today-trend';
import { formatTrendAverage } from '../lib/work-today-trend';

const CHART_HEIGHT = 148;
const PAD_TOP = 28;
const PAD_BOTTOM = 10;
const PAD_X = 4;
/** Left average bar covers early weeks; right bar covers the recent window. */
const LONG_BAR_END_RATIO = 0.42;
const SHORT_BAR_START_RATIO = 0.72;

type ChartGeom = {
  width: number;
  coords: Array<{ x: number; y: number }>;
  longY: number;
  shortY: number;
  longBar: { x1: number; x2: number };
  shortBar: { x1: number; x2: number };
  linePath: string;
};

function buildGeom(points: number[], width: number, longAvg: number, shortAvg: number): ChartGeom {
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotW = Math.max(1, width - PAD_X * 2);
  const values = [...points, longAvg, shortAvg];
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Flat series (common when backlog has no weekly history) still needs vertical room
  // so average bars sit mid-chart like Health — not stuck on the baseline.
  const rawSpan = max - min;
  const span = rawSpan < 1 ? Math.max(max * 0.35, 4) : rawSpan;
  const mid = (min + max) / 2;
  const yMin = rawSpan < 1 ? mid - span / 2 : min - span * 0.08;
  const yMax = rawSpan < 1 ? mid + span / 2 : max + span * 0.18;
  const ySpan = yMax - yMin || 1;

  const yFor = (value: number) => PAD_TOP + (1 - (value - yMin) / ySpan) * plotH;

  const coords = points.map((value, index) => {
    const t = points.length <= 1 ? 0 : index / (points.length - 1);
    return {
      x: PAD_X + t * plotW,
      y: yFor(value),
    };
  });

  const longY = yFor(longAvg);
  const shortY = yFor(shortAvg);
  const longBar = {
    x1: PAD_X,
    x2: PAD_X + plotW * LONG_BAR_END_RATIO,
  };
  const shortBar = {
    x1: PAD_X + plotW * SHORT_BAR_START_RATIO,
    x2: PAD_X + plotW,
  };

  const linePath =
    coords.length === 0
      ? ''
      : coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return { width, coords, longY, shortY, longBar, shortBar, linePath };
}

/**
 * Apple Health Highlights chart — thin series + two thick average bars.
 * Pixel language matched to Health: muted history line, accent recent window.
 */
export const WorkTodayChart = memo(function WorkTodayChart({
  trend,
  accent,
  width: widthProp,
}: {
  trend: WorkTodayTrend;
  accent: string;
  width?: number;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // Card inset: screen pad 20 + card pad 16×2 ≈ content width.
  const width = widthProp ?? Math.min(windowWidth - 72, 360);

  const history = withAlpha(colors.mutedForeground, 0.45);
  const historyStrong = withAlpha(colors.mutedForeground, 0.72);
  const dotFill = withAlpha(colors.mutedForeground, 0.55);

  const geom = useMemo(
    () =>
      buildGeom(
        trend.chartPoints.length > 0 ? trend.chartPoints : trend.points,
        width,
        trend.longAverage,
        trend.shortAverage,
      ),
    [trend.chartPoints, trend.points, trend.longAverage, trend.shortAverage, width],
  );

  const skPath = useMemo(() => {
    if (!geom.linePath) return null;
    return Skia.Path.MakeFromSVGString(geom.linePath);
  }, [geom.linePath]);

  const longLabel = formatTrendAverage(trend.longAverage);
  const shortLabel = formatTrendAverage(trend.shortAverage);

  return (
    <View style={{ width, height: CHART_HEIGHT + 4 }}>
      {/* Value labels above average bars — RN Text for Dynamic Type */}
      <Text
        variant="footnote"
        style={[
          styles.avgLabel,
          {
            color: historyStrong,
            left: geom.longBar.x1,
            top: Math.max(0, geom.longY - 22),
          },
        ]}
        maxFontSizeMultiplier={1.15}
      >
        {longLabel}
      </Text>
      <Text
        variant="footnote"
        style={[
          styles.avgLabel,
          {
            color: accent,
            right: 0,
            textAlign: 'right',
            top: Math.max(0, geom.shortY - 22),
          },
        ]}
        maxFontSizeMultiplier={1.15}
      >
        {shortLabel}
      </Text>

      <Canvas style={{ width, height: CHART_HEIGHT }}>
        <Group>
          {skPath ? (
            <Path
              path={skPath}
              color={history}
              style="stroke"
              strokeWidth={1.5}
              strokeJoin="round"
              strokeCap="round"
            />
          ) : null}

          {geom.coords.map((point, index) => (
            <Circle
              key={`pt-${index}`}
              cx={point.x}
              cy={point.y}
              r={2.75}
              color={dotFill}
            />
          ))}

          {/* Long-window average — thick muted bar (left). */}
          <Line
            p1={vec(geom.longBar.x1, geom.longY)}
            p2={vec(geom.longBar.x2, geom.longY)}
            color={historyStrong}
            strokeWidth={5}
            style="stroke"
            strokeCap="round"
          />

          {/* Short-window average — thick accent bar (right). */}
          <Line
            p1={vec(geom.shortBar.x1, geom.shortY)}
            p2={vec(geom.shortBar.x2, geom.shortY)}
            color={accent}
            strokeWidth={5}
            style="stroke"
            strokeCap="round"
          />
        </Group>
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  avgLabel: {
    position: 'absolute',
    zIndex: 2,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
});
