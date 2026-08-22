import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { Text } from '@/components/ui';

import { fin } from '../../layout';
import { buildChartGeometry, nearestIndex } from '../../lib/chart-geometry';

export type FinCurvePoint = {
  label: string;
  value: number;
};

type FinSkiaCurveChartProps = {
  points: FinCurvePoint[];
  drawKey: string;
  activeIndex: number | null;
  onScrub: (index: number | null) => void;
  hasData: boolean;
  color?: string;
  height?: number;
  /** Previous-period average drawn as a thick reference bar (Health Highlights). */
  baseline?: number | null;
  /** Labels the reference line when baseline is visible. */
  formatBaseline?: (value: number) => string;
};

const TICK_COUNT = 8;

/**
 * Scrubbable finance curve rendered with Skia.
 *
 * Same geometry as the shared monotone interpolator — no grid, no y-axis. The
 * marks are the fill, the zero crossing when the series goes negative, optional
 * baseline bars, and the cursor under the finger.
 */
export function FinSkiaCurveChart({
  points,
  drawKey,
  activeIndex,
  onScrub,
  hasData,
  color,
  height = fin.chartHeight,
  baseline = null,
  formatBaseline,
}: FinSkiaCurveChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

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
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .enabled(hasData && count > 1 && width > 0)
        .runOnJS(true)
        .onStart((event) => onScrub(nearestIndex(event.x, width, count, fin.chartPadX)))
        .onUpdate((event) => onScrub(nearestIndex(event.x, width, count, fin.chartPadX)))
        .onFinalize(endScrub),
    [count, endScrub, hasData, onScrub, width],
  );

  const linePath = useMemo(
    () => (geometry.line ? Skia.Path.MakeFromSVGString(geometry.line) : null),
    [geometry.line],
  );
  const areaPath = useMemo(
    () => (geometry.area ? Skia.Path.MakeFromSVGString(geometry.area) : null),
    [geometry.area],
  );

  const baselineY = useMemo(() => {
    if (baseline === null || width <= 0 || geometry.points.length === 0) return null;
    if (baseline < geometry.min || baseline > geometry.max) return null;
    const span = geometry.max - geometry.min || 1;
    const innerHeight = Math.max(1, geometry.baselineY - fin.chartPadTop);
    return geometry.baselineY - ((baseline - geometry.min) / span) * innerHeight;
  }, [baseline, geometry, width]);

  const cursor =
    activeIndex != null && geometry.points[activeIndex] ? geometry.points[activeIndex] : null;
  const last = geometry.points[geometry.points.length - 1] ?? null;

  const baselineLabel =
    baselineY != null && baseline != null && formatBaseline ? formatBaseline(baseline) : null;

  const tickXs = useMemo(() => {
    if (width <= 0) return [];
    const plotW = Math.max(1, width - fin.chartPadX * 2);
    return Array.from({ length: TICK_COUNT }, (_, index) => fin.chartPadX + (index / (TICK_COUNT - 1)) * plotW);
  }, [width]);

  return (
    <GestureDetector gesture={pan}>
      <View style={{ position: 'relative' }}>
        {baselineLabel ? (
          <Text
            variant="footnote"
            style={[
              styles.avgLabel,
              {
                color: withAlpha(colors.mutedForeground, 0.85),
                left: fin.chartPadX,
                top: Math.max(0, (baselineY ?? 0) - 22),
              },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {baselineLabel}
          </Text>
        ) : null}

        <View onLayout={onLayout} style={{ height, justifyContent: 'center' }} collapsable={false}>
        {width > 0 && linePath ? (
          <Canvas style={{ width, height }}>
            <Group>
              {geometry.zeroY != null ? (
                <Line
                  p1={vec(0, geometry.zeroY)}
                  p2={vec(width, geometry.zeroY)}
                  color={withAlpha(colors.mutedForeground, 0.3)}
                  strokeWidth={1}
                  style="stroke"
                >
                  <DashPathEffect intervals={[3, 4]} />
                </Line>
              ) : null}

              {baselineY != null ? (
                <Line
                  p1={vec(fin.chartPadX, baselineY)}
                  p2={vec(width * 0.42, baselineY)}
                  color={withAlpha(colors.mutedForeground, 0.72)}
                  strokeWidth={5}
                  style="stroke"
                  strokeCap="round"
                />
              ) : null}

              {hasData && areaPath ? (
                <Path path={areaPath} style="fill">
                  <LinearGradient
                    start={vec(0, fin.chartPadTop)}
                    end={vec(0, geometry.baselineY)}
                    colors={[withAlpha(stroke, 0.24), withAlpha(stroke, 0.02)]}
                  />
                </Path>
              ) : null}

              <Path
                path={linePath}
                color={stroke}
                style="stroke"
                strokeWidth={hasData ? 2.5 : 1.5}
                strokeJoin="round"
                strokeCap="round"
              />

              {tickXs.map((x, index) => (
                <Circle
                  key={`tick-${index}`}
                  cx={x}
                  cy={height - fin.chartPadBottom + 7}
                  r={1}
                  color={withAlpha(colors.mutedForeground, 0.45)}
                />
              ))}

              {cursor ? (
                <>
                  <Line
                    p1={vec(cursor.x, fin.chartPadTop - 8)}
                    p2={vec(cursor.x, geometry.baselineY)}
                    color={withAlpha(colors.foreground, 0.24)}
                    strokeWidth={1}
                  />
                  <Circle cx={cursor.x} cy={cursor.y} r={8} color={withAlpha(stroke, 0.18)} />
                  <Circle
                    cx={cursor.x}
                    cy={cursor.y}
                    r={4}
                    color={colors.card}
                    style="stroke"
                    strokeWidth={2.5}
                  />
                  <Circle cx={cursor.x} cy={cursor.y} r={4} color={stroke} />
                </>
              ) : hasData && last ? (
                <>
                  <Circle cx={last.x} cy={last.y} r={7} color={withAlpha(stroke, 0.16)} />
                  <Circle cx={last.x} cy={last.y} r={3.5} color={stroke} />
                </>
              ) : null}
            </Group>
          </Canvas>
        ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  avgLabel: {
    position: 'absolute',
    zIndex: 2,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
});
