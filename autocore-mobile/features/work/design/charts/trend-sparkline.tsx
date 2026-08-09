import { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

import { workOsColors } from '../tokens/colors';

export type TrendSparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  scheme?: 'light' | 'dark';
  positiveIsUp?: boolean;
};

export const TrendSparkline = memo(function TrendSparkline({
  points,
  width = 120,
  height = 36,
  scheme = 'light',
  positiveIsUp = true,
}: TrendSparklineProps) {
  const colors = workOsColors(scheme);
  const path = useMemo(() => {
    if (points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * width;
        const y = height - ((p - min) / span) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
  }, [points, width, height]);

  const delta = points.length >= 2 ? points[points.length - 1]! - points[0]! : 0;
  const stroke = (positiveIsUp ? delta >= 0 : delta <= 0) ? colors.kpiPositive : colors.kpiNegative;

  const last = useMemo(() => {
    if (points.length === 0) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    const i = points.length - 1;
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = height - ((points[i]! - min) / span) * (height - 4) - 2;
    return { x, y };
  }, [points, width, height]);

  return (
    <View accessibilityLabel="Trend sparkline">
      <Svg width={width} height={height}>
        <Polyline points={path} fill="none" stroke={stroke} strokeWidth={2} />
        {last ? <Circle cx={last.x} cy={last.y} r={3} fill={stroke} /> : null}
      </Svg>
    </View>
  );
});
