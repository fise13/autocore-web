import { memo, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { withAlpha } from '@/theme/color-utils';

import { buildChartGeometry } from '../lib/chart-geometry';

/**
 * Row-scale shape. It carries direction only — no dots, no fill, no axis — so
 * it reads at a glance beside a value without competing with it.
 */
export const FinSparkline = memo(function FinSparkline({
  values,
  color,
  width = 56,
  height = 20,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const geometry = useMemo(
    () => buildChartGeometry({ values, width, height, padTop: 3, padBottom: 3 }),
    [height, values, width],
  );

  if (!geometry.line) return null;

  return (
    <Svg width={width} height={height}>
      <Path
        d={geometry.line}
        fill="none"
        stroke={withAlpha(color, 0.85)}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
