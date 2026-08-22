import { memo, useCallback, useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildChartGeometry } from '@/features/finance/lib/chart-geometry';
import { useTheme } from '@/hooks';

import type { HomeSeriesPoint } from '../types';

/**
 * The quiet inline series under a leading metric.
 *
 * The canvas is measured rather than given a fixed viewBox: an SVG with a
 * `viewBox` and `width="100%"` letterboxes instead of stretching, which draws
 * the line at its authored width and leaves dead space on both sides of the row.
 *
 * Geometry comes from the same monotone interpolator the trend chart and Finance
 * use, so an inline spark and a full chart of the same data cannot disagree
 * about the shape.
 */
const HEIGHT_PAD_TOP = 4;
const HEIGHT_PAD_BOTTOM = 4;
/** Keeps the end marker and its cap inside the canvas. */
const PAD_X = 4;

type HomeSparklineProps = {
  points: HomeSeriesPoint[];
  height?: number;
  color?: string;
  showArea?: boolean;
};

export const HomeSparkline = memo(function HomeSparkline({
  points,
  height = 40,
  color,
  showArea = true,
}: HomeSparklineProps) {
  const { colors } = useTheme();
  const gradientId = useId();
  const [width, setWidth] = useState(0);
  const stroke = color ?? colors.chart1;

  const values = useMemo(() => points.map((point) => point.value), [points]);

  const geometry = useMemo(
    () =>
      buildChartGeometry({
        values,
        width,
        height,
        padTop: HEIGHT_PAD_TOP,
        padBottom: HEIGHT_PAD_BOTTOM,
        padX: PAD_X,
      }),
    [height, values, width],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, []);

  const last = geometry.points[geometry.points.length - 1] ?? null;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && geometry.line ? (
        <Svg width={width} height={height}>
          {showArea ? (
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.16} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </LinearGradient>
            </Defs>
          ) : null}

          {showArea && geometry.area ? (
            <Path d={geometry.area} fill={`url(#${gradientId})`} />
          ) : null}

          <Path
            d={geometry.line}
            fill="none"
            stroke={stroke}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {last ? <Circle cx={last.x} cy={last.y} r={3} fill={stroke} /> : null}
        </Svg>
      ) : null}
    </View>
  );
});
