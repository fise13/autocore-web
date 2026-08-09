import { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme/tokens';

export type ChartPoint = { x: number; y: number; label?: string };

type LineChartProps = {
  /** Business question this chart answers — required for product review. */
  question: string;
  /** Hide the question label when the parent section already titles the series. */
  hideQuestion?: boolean;
  points: ChartPoint[];
  height?: number;
  showArea?: boolean;
  seriesColor?: string;
  annotation?: string;
};

/**
 * Compact Autocore line/area chart — no decorative gradients or pie spam.
 */
export const LineChart = memo(function LineChart({
  question,
  hideQuestion = false,
  points,
  height = 120,
  showArea = false,
  seriesColor,
  annotation,
}: LineChartProps) {
  const { colors } = useTheme();
  const stroke = seriesColor ?? colors.chart1;
  const width = 320;

  const geometry = useMemo(() => {
    if (points.length === 0) {
      return { poly: '', area: '', dots: [] as Array<{ cx: number; cy: number }> };
    }
    const ys = points.map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = maxY - minY || 1;
    const padX = 8;
    const padY = 10;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const coords = points.map((p, i) => {
      const cx =
        points.length === 1
          ? width / 2
          : padX + (i / (points.length - 1)) * innerW;
      const cy = padY + (1 - (p.y - minY) / span) * innerH;
      return { cx, cy };
    });
    const poly = coords.map((c) => `${c.cx},${c.cy}`).join(' ');
    const areaPath = [
      `M ${coords[0].cx} ${height - padY}`,
      ...coords.map((c) => `L ${c.cx} ${c.cy}`),
      `L ${coords[coords.length - 1].cx} ${height - padY}`,
      'Z',
    ].join(' ');
    return { poly, area: areaPath, dots: coords };
  }, [height, points]);

  return (
    <View style={{ gap: tokens.space.micro }}>
      {!hideQuestion && question ? (
        <Text variant="sectionLabel" color="muted">
          {question}
        </Text>
      ) : null}
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {showArea && geometry.area ? (
          <Path d={geometry.area} fill={stroke} opacity={0.12} />
        ) : null}
        {geometry.poly ? (
          <Polyline
            points={geometry.poly}
            fill="none"
            stroke={stroke}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {geometry.dots.length > 0 ? (
          <Circle
            cx={geometry.dots[geometry.dots.length - 1].cx}
            cy={geometry.dots[geometry.dots.length - 1].cy}
            r={3}
            fill={stroke}
          />
        ) : null}
      </Svg>
      {annotation ? (
        <Text variant="caption1" color="muted">
          {annotation}
        </Text>
      ) : null}
    </View>
  );
});
