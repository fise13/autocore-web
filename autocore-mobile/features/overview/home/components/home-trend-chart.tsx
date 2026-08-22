import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Text } from '@/components/ui';
import { buildChartGeometry, nearestIndex } from '@/features/finance/lib/chart-geometry';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { autocoreEase } from '@/theme/motion';

import type { HomeSeriesPoint } from '../types';
import { home, homeFontCap } from './home-primitives';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHART_HEIGHT = 150;
const PAD_TOP = 18;
const PAD_BOTTOM = 18;
/** Keeps the end marker and its halo inside the canvas. */
const PAD_X = 9;
/** Reserved so the readout swapping in on scrub never nudges the layout. */
const READOUT_HEIGHT = 40;
const TICK_COUNT = 8;
/**
 * Past this many samples a mark per point stops reading as measurements and
 * starts reading as a beaded chain, so the line carries the shape on its own.
 */
const MAX_SAMPLE_MARKS = 10;

type HomeTrendChartProps = {
  points: HomeSeriesPoint[];
  /** Changing this redraws the curve — pass the period plus a data digest. */
  drawKey: string;
  color: string;
  formatValue: (value: number) => string;
  /** Shown in the readout while nothing is selected. */
  idleLabel: string;
  /**
   * The previous window's average per bucket. Drawn as the quiet line the
   * current series is read against — null when there is no earlier period.
   */
  baseline: number | null;
};

/**
 * The trend curve.
 *
 * No gridlines, no y-axis, no legend box: the marks are the line, the reference
 * the series is read against, the tick rail underneath, and the cursor under the
 * reader's finger. Geometry comes from the same monotone interpolator Finance
 * uses, so a curve cannot bend into a dip the data does not contain.
 *
 * Horizontal drags scrub and vertical drags belong to the page, so the chart
 * never traps the scroll.
 */
export const HomeTrendChart = memo(function HomeTrendChart({
  points,
  drawKey,
  color,
  formatValue,
  idleLabel,
  baseline,
}: HomeTrendChartProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const progress = useSharedValue(reduced ? 1 : 0);

  const values = useMemo(() => points.map((point) => point.value), [points]);

  const geometry = useMemo(
    () =>
      buildChartGeometry({
        values,
        width,
        height: CHART_HEIGHT,
        padTop: PAD_TOP,
        padBottom: PAD_BOTTOM,
        padX: PAD_X,
      }),
    [values, width],
  );

  useEffect(() => {
    if (reduced || width <= 0) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 560, easing: autocoreEase });
  }, [drawKey, progress, reduced, width]);

  // A new range invalidates whatever the finger had selected.
  useEffect(() => {
    setActiveIndex(null);
  }, [drawKey]);

  const pathLength = useMemo(() => estimateLength(geometry.points), [geometry.points]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
    strokeDasharray: [pathLength, pathLength],
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));

  /**
   * One tick per bucket crossed. The gesture fires every frame, but the cursor
   * is state — React drops identical values, so this runs exactly when the
   * reader lands on a new sample.
   */
  useEffect(() => {
    if (activeIndex == null) return;
    haptics.selection();
  }, [activeIndex]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, []);

  const count = points.length;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        /**
         * Scrubbing begins on a deliberate touch-and-hold.
         *
         * A pan that arms on the first pixel of movement wins the touch from the
         * scroll view underneath it — and because the loser of that contest is
         * the page, the whole of Home stopped scrolling, not just the chart.
         * Requiring a hold hands quick drags back to the page and reserves the
         * chart for someone who meant to read it, which is also how a chart is
         * explored on iOS.
         */
        .activateAfterLongPress(160)
        .failOffsetY([-16, 16])
        .enabled(count > 1 && width > 0)
        // The cursor is React state, not a shared value, so the gesture has no
        // reason to live on the UI thread.
        .runOnJS(true)
        .onStart((event) => setActiveIndex(nearestIndex(event.x, width, count, PAD_X)))
        .onUpdate((event) => setActiveIndex(nearestIndex(event.x, width, count, PAD_X)))
        .onFinalize(() => setActiveIndex(null)),
    [count, width],
  );

  const chartPoints = geometry.points;
  const cursor = activeIndex != null && chartPoints[activeIndex] ? chartPoints[activeIndex] : null;
  const selected = activeIndex != null ? points[activeIndex] : null;
  const last = chartPoints[chartPoints.length - 1] ?? null;

  /**
   * The reference line is drawn only when it actually falls inside the plotted
   * range. Clamping it to the edge would put a line at the top of the canvas
   * that looks like a measured value and is not one; when last period sits off
   * the scale, the legend still prints the number and the chart stays honest.
   */
  const baselineY = useMemo(() => {
    if (baseline === null || width <= 0 || chartPoints.length === 0) return null;
    if (baseline < geometry.min || baseline > geometry.max) return null;
    const span = geometry.max - geometry.min || 1;
    const innerHeight = Math.max(1, geometry.baselineY - PAD_TOP);
    return geometry.baselineY - ((baseline - geometry.min) / span) * innerHeight;
  }, [baseline, chartPoints.length, geometry, width]);

  /**
   * At most eight labels fit across a phone at caption size; past that the axis
   * thins to the two ends rather than overlapping itself into a smear.
   */
  const labelledPoints = useMemo(
    () => (points.length <= 8 ? points : [points[0], points[points.length - 1]]),
    [points],
  );

  return (
    <View>
      <View style={{ height: READOUT_HEIGHT, justifyContent: 'flex-end' }}>
        {selected ? (
          <View style={{ gap: 1 }}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={homeFontCap.metric}
              style={{
                fontSize: 22,
                lineHeight: 27,
                fontWeight: '600',
                letterSpacing: -0.4,
                fontVariant: ['tabular-nums'],
                color: colors.foreground,
              }}
            >
              {formatValue(selected.value)}
            </Text>
            <Text variant="caption1" color="muted" numberOfLines={1}>
              {selected.label}
            </Text>
          </View>
        ) : (
          // The interaction is a hold, so the label says so rather than leaving
          // the reader to discover it by accident.
          <Text variant="caption1" color="muted" numberOfLines={1}>
            {`${idleLabel} · hold to explore`}
          </Text>
        )}
      </View>

      <GestureDetector gesture={pan}>
        <View
          onLayout={onLayout}
          collapsable={false}
          style={{ height: CHART_HEIGHT, justifyContent: 'center' }}
        >
          {width > 0 && geometry.line ? (
            <Svg width={width} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.2} />
                  <Stop offset="0.78" stopColor={color} stopOpacity={0.04} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {baselineY != null ? (
                <>
                  <Line
                    x1={0}
                    y1={baselineY}
                    x2={width}
                    y2={baselineY}
                    stroke={withAlpha(colors.mutedForeground, 0.55)}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {/* The reference carries its own value, the way Health prints
                      the long-run average on the line rather than in a key. */}
                  <SvgText
                    x={0}
                    y={baselineY - 6}
                    fill={colors.mutedForeground}
                    fontSize={11}
                    fontWeight="600"
                  >
                    {formatValue(baseline ?? 0)}
                  </SvgText>
                </>
              ) : null}

              {geometry.area ? (
                <AnimatedPath
                  d={geometry.area}
                  fill={`url(#${gradientId})`}
                  animatedProps={areaProps}
                />
              ) : null}

              {geometry.line ? (
                <AnimatedPath
                  d={geometry.line}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animatedProps={lineProps}
                />
              ) : null}

              {/* Tick rail — the axis is dots, never a boxed grid. */}
              {Array.from({ length: TICK_COUNT }, (_, index) => {
                const x = PAD_X + (index / (TICK_COUNT - 1)) * Math.max(1, width - PAD_X * 2);
                return (
                  <Rect
                    key={index}
                    x={x - 1}
                    y={CHART_HEIGHT - PAD_BOTTOM + 7}
                    width={2}
                    height={2}
                    rx={1}
                    fill={withAlpha(colors.mutedForeground, 0.45)}
                  />
                );
              })}

              {/* A mark per sample, so the reader can see where the curve was
                  measured and where it was interpolated between measurements. */}
              {activeIndex === null && chartPoints.length <= MAX_SAMPLE_MARKS
                ? chartPoints.slice(0, -1).map((point, index) => (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={2.5}
                      fill={colors.card}
                      stroke={withAlpha(color, 0.85)}
                      strokeWidth={1.5}
                    />
                  ))
                : null}

              {cursor ? (
                <>
                  <Line
                    x1={cursor.x}
                    y1={PAD_TOP - 10}
                    x2={cursor.x}
                    y2={geometry.baselineY}
                    stroke={withAlpha(colors.foreground, 0.24)}
                    strokeWidth={1}
                  />
                  <Circle cx={cursor.x} cy={cursor.y} r={8} fill={withAlpha(color, 0.18)} />
                  <Circle
                    cx={cursor.x}
                    cy={cursor.y}
                    r={4}
                    fill={colors.card}
                    stroke={color}
                    strokeWidth={2.5}
                  />
                </>
              ) : last ? (
                <>
                  <Circle cx={last.x} cy={last.y} r={7} fill={withAlpha(color, 0.16)} />
                  <Circle
                    cx={last.x}
                    cy={last.y}
                    r={4}
                    fill={color}
                    stroke={colors.card}
                    strokeWidth={2}
                  />
                  {/* The latest reading is named on the curve, so the headline
                      figure and the right-hand end of the line agree. */}
                  <SvgText
                    x={width}
                    y={Math.max(12, last.y - 12)}
                    textAnchor="end"
                    fill={color}
                    fontSize={12}
                    fontWeight="700"
                  >
                    {formatValue(values[values.length - 1] ?? 0)}
                  </SvgText>
                </>
              ) : null}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

      {/* Every bucket is named. An axis labelled only at its ends asks the
          reader to count, and the whole point of the rail is that they do not
          have to. Labels fall back to the ends when there are too many to fit. */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: home.micro,
          paddingHorizontal: PAD_X,
        }}
      >
        {labelledPoints.map((point, index) => (
          <Text
            key={`${point.label}-${index}`}
            variant="caption2"
            color="muted"
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign:
                index === 0 ? 'left' : index === labelledPoints.length - 1 ? 'right' : 'center',
            }}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
});

function estimateLength(points: Array<{ x: number; y: number }>): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  // Curved segments run slightly longer than the chords between samples.
  return Math.max(1, length * 1.08);
}
