import { useEffect, useMemo } from 'react';
import Svg, { Polyline } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { buildSparklinePoints, sanitizeChartSeries } from '@/lib/charts/sparkline-points';
import { autocoreEase } from '@/theme/motion';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

function buildPoints(values: number[], width: number, height: number): string {
  return buildSparklinePoints(sanitizeChartSeries(values), width, height, 2);
}

function estimatePathLength(points: string): number {
  const pairs = points.split(' ').map((pair) => pair.split(',').map(Number));
  let length = 0;

  for (let i = 1; i < pairs.length; i += 1) {
    const [x1, y1] = pairs[i - 1];
    const [x2, y2] = pairs[i];
    length += Math.hypot(x2 - x1, y2 - y1);
  }

  return length;
}

type McAnimatedSparklineProps = {
  values: number[];
  color: string;
  delay?: number;
  duration?: number;
  width?: number;
  height?: number;
};

export function McAnimatedSparkline({
  values,
  color,
  delay = 0,
  duration = 580,
  width = 64,
  height = 22,
}: McAnimatedSparklineProps) {
  const reduced = useReducedMotion();
  const points = useMemo(() => buildPoints(values, width, height), [height, values, width]);
  const pathLength = useMemo(() => estimatePathLength(points), [points]);
  const offset = useSharedValue(reduced ? 0 : pathLength);

  useEffect(() => {
    if (reduced) {
      offset.value = 0;
      return;
    }
    offset.value = pathLength;
    offset.value = withDelay(delay, withTiming(0, { duration, easing: autocoreEase }));
  }, [delay, duration, offset, pathLength, reduced]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
    strokeDasharray: [pathLength, pathLength],
  }));

  return (
    <Svg width={width} height={height}>
      <AnimatedPolyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.75}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
