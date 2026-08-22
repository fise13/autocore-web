import { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  Path,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import {
  computeChartScale,
  markerStride,
  scaleToX,
  scaleToY,
  showsMarker,
  type ChartScale,
} from '../lib/chart-scale';
import type { WorkTodayTrend } from '../lib/work-today-trend';
import { formatTrendAverage } from '../lib/work-today-trend';

const CHART_HEIGHT = 148;
/** Room above the plot for the two average value labels. */
const PAD_TOP = 26;
const PAD_BOTTOM = 12;
const PAD_X = 6;

const LINE_WIDTH = 1.5;
const AVG_BAR_WIDTH = 5;
const DOT_RADIUS = 2.75;
const LAST_DOT_RADIUS = 3.5;
const LAST_HALO_RADIUS = 7;
/** Below this spacing markers collide, so they thin out — the line stays whole. */
const MIN_MARKER_SPACING = 13;

/**
 * Open work is a count: whole-unit ticks, never a negative axis.
 * Zero is *not* forced — a backlog that moves 640 → 671 must read as a 31-unit
 * move, not as a flat line pinned to the bottom of a 0–700 axis.
 */
const MIN_VISUAL_RANGE = 4;

type Point = { x: number; y: number; value: number };

type ChartGeom = {
  scale: ChartScale;
  points: Point[];
  /** First index of the recent window — the two-tone split. */
  split: number;
  stride: number;
  longY: number;
  shortY: number;
  longBar: { x1: number; x2: number };
  shortBar: { x1: number; x2: number };
  gridY: number[];
  plot: { left: number; right: number; top: number; height: number; width: number };
};

function buildGeom(
  values: number[],
  width: number,
  longAvg: number,
  shortAvg: number,
  shortWeeks: number,
  zeroBaseline: boolean,
): ChartGeom | null {
  // Rule: recompute the whole scale from the current dataset — no carried state,
  // no fixed range. Averages ride the same axis as the series (companions).
  const scale = computeChartScale(values, {
    companions: [longAvg, shortAvg],
    integer: true,
    minVisualRange: MIN_VISUAL_RANGE,
    zeroBaseline,
  });
  if (!scale) return null;

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotWidth = Math.max(1, width - PAD_X * 2);
  const count = values.length;

  const points: Point[] = values.map((value, index) => ({
    x: scaleToX(index, count, PAD_X, plotWidth),
    y: scaleToY(scale, value, PAD_TOP, plotHeight),
    value,
  }));

  // Health convention: the long window is summarised over the earlier stretch,
  // the recent window over the last `shortWeeks` — side by side, never stacked,
  // and both positioned by the same Y scale.
  //
  // A series shorter than the recent window has no "earlier stretch": both
  // averages then cover the same weeks and are equal, so both bars run the
  // full width rather than the long one collapsing to a dot at the left edge.
  const wholeSeriesIsRecent = count <= shortWeeks;
  const split = wholeSeriesIsRecent ? 0 : count - shortWeeks;
  const plotRight = PAD_X + plotWidth;
  const boundaryX = points[Math.max(0, split - 1)]?.x ?? PAD_X;
  const recentX = points[Math.min(count - 1, split)]?.x ?? boundaryX;

  return {
    scale,
    points,
    split,
    stride: markerStride(count, plotWidth, MIN_MARKER_SPACING),
    longY: scaleToY(scale, longAvg, PAD_TOP, plotHeight),
    shortY: scaleToY(scale, shortAvg, PAD_TOP, plotHeight),
    longBar: { x1: PAD_X, x2: wholeSeriesIsRecent ? plotRight : boundaryX },
    shortBar: { x1: wholeSeriesIsRecent ? PAD_X : recentX, x2: plotRight },
    gridY: scale.ticks.map((tick) => scaleToY(scale, tick, PAD_TOP, plotHeight)),
    plot: {
      left: PAD_X,
      right: plotRight,
      top: PAD_TOP,
      height: plotHeight,
      width: plotWidth,
    },
  };
}

/** Polyline through `points[from..to]`. Values are plotted as they are. */
function polyline(points: Point[], from: number, to: number): SkPath | null {
  if (to <= from) return null;
  const path = Skia.Path.Make();
  path.moveTo(points[from].x, points[from].y);
  for (let index = from + 1; index <= to; index += 1) {
    path.lineTo(points[index].x, points[index].y);
  }
  return path;
}

function gridPath(gridY: number[], left: number, right: number): SkPath | null {
  if (gridY.length === 0) return null;
  const path = Skia.Path.Make();
  for (const y of gridY) {
    path.moveTo(left, y);
    path.lineTo(right, y);
  }
  return path;
}

/**
 * Apple Health Highlights chart, drawn entirely in Skia.
 *
 * The Y axis is derived from the data on every render (see `lib/chart-scale`):
 * padded 10–20%, snapped to 3–5 human-readable levels, given a minimum window
 * when the series is flat, and never forced to zero unless the metric asks for
 * it. Real values — outliers included — are plotted untouched; nothing is
 * smoothed, clipped, or re-centred to make the picture tidier.
 */
export const WorkTodayChart = memo(function WorkTodayChart({
  trend,
  accent,
  width: widthProp,
  zeroBaseline = false,
}: {
  trend: WorkTodayTrend;
  accent: string;
  width?: number;
  /** Set only for metrics that are meaningless without a zero baseline. */
  zeroBaseline?: boolean;
}) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // Card inset: screen pad 20 + card pad 16×2 ≈ content width.
  const width = widthProp ?? Math.min(windowWidth - 72, 360);

  const history = withAlpha(colors.mutedForeground, 0.45);
  const historyStrong = withAlpha(colors.mutedForeground, 0.72);
  const dotFill = withAlpha(colors.mutedForeground, 0.55);
  const grid = withAlpha(colors.mutedForeground, 0.16);
  const accentDot = withAlpha(accent, 0.9);
  const accentHalo = withAlpha(accent, 0.18);

  const geom = useMemo(
    () =>
      buildGeom(
        trend.points,
        width,
        trend.longAverage,
        trend.shortAverage,
        trend.shortWeeks,
        zeroBaseline,
      ),
    [
      trend.points,
      trend.longAverage,
      trend.shortAverage,
      trend.shortWeeks,
      width,
      zeroBaseline,
    ],
  );

  const paths = useMemo(() => {
    if (!geom) return { history: null, recent: null, grid: null };
    const { points, split, plot } = geom;
    return {
      // The recent path starts one point early so the transition segment is
      // drawn once, in the accent colour, with no gap at the seam.
      history: polyline(points, 0, split - 1),
      recent: polyline(points, Math.max(0, split - 1), points.length - 1),
      grid: gridPath(geom.gridY, plot.left, plot.right),
    };
  }, [geom]);

  if (!geom) {
    return (
      <View style={{ width, height: CHART_HEIGHT + 4, justifyContent: 'center' }}>
        <Text variant="footnote" color="muted" style={{ textAlign: 'center' }}>
          No weekly history yet
        </Text>
      </View>
    );
  }

  const { points, stride } = geom;
  // A lone point is already centred by `scaleToX`, so it needs no special case.
  const lastPoint = points[points.length - 1];

  const longLabel = formatTrendAverage(trend.longAverage);
  const shortLabel = formatTrendAverage(trend.shortAverage);

  return (
    <View style={{ width, height: CHART_HEIGHT + 4 }}>
      {/* Value labels above the average bars — RN Text so Dynamic Type applies. */}
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
          {/* 3–5 nice levels — the visible proof that the axis is data-derived. */}
          {paths.grid ? (
            <Path path={paths.grid} color={grid} style="stroke" strokeWidth={1}>
              <DashPathEffect intervals={[2, 5]} />
            </Path>
          ) : null}

          {/* Earlier weeks — muted. */}
          {paths.history ? (
            <Path
              path={paths.history}
              color={history}
              style="stroke"
              strokeWidth={LINE_WIDTH}
              strokeJoin="round"
              strokeCap="round"
            />
          ) : null}

          {/* Recent window — accent. */}
          {paths.recent ? (
            <Path
              path={paths.recent}
              color={withAlpha(accent, 0.75)}
              style="stroke"
              strokeWidth={LINE_WIDTH}
              strokeJoin="round"
              strokeCap="round"
            />
          ) : null}

          {points.map((point, index) =>
            showsMarker(index, points.length, stride) && index !== points.length - 1 ? (
              <Circle
                key={`pt-${index}`}
                cx={point.x}
                cy={point.y}
                r={DOT_RADIUS}
                color={index >= geom.split ? accentDot : dotFill}
              />
            ) : null,
          )}

          {/* Long-window average — thick muted bar over the earlier stretch. */}
          <Line
            p1={vec(geom.longBar.x1, geom.longY)}
            p2={vec(geom.longBar.x2, geom.longY)}
            color={historyStrong}
            strokeWidth={AVG_BAR_WIDTH}
            style="stroke"
            strokeCap="round"
          />

          {/* Recent-window average — thick accent bar over the last weeks. */}
          <Line
            p1={vec(geom.shortBar.x1, geom.shortY)}
            p2={vec(geom.shortBar.x2, geom.shortY)}
            color={accent}
            strokeWidth={AVG_BAR_WIDTH}
            style="stroke"
            strokeCap="round"
          />

          {/* Latest reading — the point the whole card is about. */}
          {lastPoint ? (
            <Group>
              <Circle cx={lastPoint.x} cy={lastPoint.y} r={LAST_HALO_RADIUS} color={accentHalo} />
              <Circle cx={lastPoint.x} cy={lastPoint.y} r={LAST_DOT_RADIUS} color={accent} />
            </Group>
          ) : null}
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
