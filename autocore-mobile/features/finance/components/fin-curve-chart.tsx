import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { autocoreEase } from '@/theme/motion';

import { fin } from '../layout';
import { buildChartGeometry, nearestIndex } from '../lib/chart-geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type FinCurvePoint = {
  label: string;
  value: number;
};

type FinCurveChartProps = {
  points: FinCurvePoint[];
  /** Changing this redraws the curve — pass the period id plus a data digest. */
  drawKey: string;
  activeIndex: number | null;
  onScrub: (index: number | null) => void;
  hasData: boolean;
  /** Explicit series colour; omitted means positive/negative by final value. */
  color?: string;
  height?: number;
};

/**
 * The curve.
 *
 * No gridlines, no y-axis, no legend: the marks are the line, the zero crossing
 * when the series genuinely goes negative, and the cursor. Horizontal drags
 * scrub; vertical drags belong to the page, so the chart never traps the scroll.
 */
export function FinCurveChart({
  points,
  drawKey,
  activeIndex,
  onScrub,
  hasData,
  color,
  height = fin.chartHeight,
}: FinCurveChartProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(reduced ? 1 : 0);

  const values = useMemo(() => points.map((point) => point.value), [points]);
  const finalValue = values.length > 0 ? values[values.length - 1] : 0;

  const stroke = !hasData
    ? withAlpha(colors.mutedForeground, 0.5)
    : (color ?? (finalValue < 0 ? colors.danger : colors.success));

  const geometry = useMemo(
    () =>
      buildChartGeometry({
        values,
        width,
        height,
        padTop: fin.chartPadTop,
        padBottom: fin.chartPadBottom,
        padX: fin.chartPadX,
      }),
    [height, values, width],
  );

  useEffect(() => {
    if (reduced || !hasData || width <= 0) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 620, easing: autocoreEase });
  }, [drawKey, hasData, progress, reduced, width]);

  const pathLength = useMemo(() => estimateLength(geometry.points), [geometry.points]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
    strokeDasharray: [pathLength, pathLength],
  }));

  const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));

  /**
   * One tick per bucket crossed. The gesture reports every frame, but the
   * cursor is state — React drops the identical values, so this effect runs
   * exactly when the reader actually lands on a new sample.
   */
  useEffect(() => {
    if (activeIndex == null) return;
    haptics.selection();
  }, [activeIndex]);

  const endScrub = useCallback(() => {
    onScrub(null);
  }, [onScrub]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, []);

  const count = points.length;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Horizontal intent scrubs; vertical intent stays with the scroll view.
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .enabled(hasData && count > 1 && width > 0)
        // The cursor is React state, not a shared value, so the gesture has no
        // reason to live on the UI thread — and this keeps the callbacks plain
        // functions instead of worklets closing over mutable state.
        .runOnJS(true)
        .onStart((event) => onScrub(nearestIndex(event.x, width, count, fin.chartPadX)))
        .onUpdate((event) => onScrub(nearestIndex(event.x, width, count, fin.chartPadX)))
        .onFinalize(endScrub),
    [count, endScrub, hasData, onScrub, width],
  );

  const cursor =
    activeIndex != null && geometry.points[activeIndex] ? geometry.points[activeIndex] : null;
  const last = geometry.points[geometry.points.length - 1] ?? null;

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View onLayout={onLayout} style={{ height, justifyContent: 'center' }} collapsable={false}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.24} />
                  <Stop offset="0.7" stopColor={stroke} stopOpacity={0.05} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {geometry.zeroY != null ? (
                <Line
                  x1={0}
                  y1={geometry.zeroY}
                  x2={width}
                  y2={geometry.zeroY}
                  stroke={withAlpha(colors.mutedForeground, 0.3)}
                  strokeWidth={1}
                  strokeDasharray={[3, 4]}
                />
              ) : null}

              {hasData && geometry.area ? (
                <AnimatedPath d={geometry.area} fill={`url(#${gradientId})`} animatedProps={areaProps} />
              ) : null}

              {geometry.line ? (
                <AnimatedPath
                  d={geometry.line}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={hasData ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animatedProps={lineProps}
                />
              ) : null}

              {cursor ? (
                <>
                  <Line
                    x1={cursor.x}
                    y1={fin.chartPadTop - 8}
                    x2={cursor.x}
                    y2={geometry.baselineY}
                    stroke={withAlpha(colors.foreground, 0.24)}
                    strokeWidth={1}
                  />
                  <Circle cx={cursor.x} cy={cursor.y} r={8} fill={withAlpha(stroke, 0.18)} />
                  <Circle
                    cx={cursor.x}
                    cy={cursor.y}
                    r={4}
                    fill={colors.card}
                    stroke={stroke}
                    strokeWidth={2.5}
                  />
                </>
              ) : hasData && last ? (
                <>
                  <Circle cx={last.x} cy={last.y} r={7} fill={withAlpha(stroke, 0.16)} />
                  <Circle cx={last.x} cy={last.y} r={3.5} fill={stroke} stroke={colors.card} strokeWidth={2} />
                </>
              ) : null}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

    </View>
  );
}

function estimateLength(points: Array<{ x: number; y: number }>): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  // Curved segments run slightly longer than the chords between samples.
  return Math.max(1, length * 1.08);
}
