import { memo, useMemo } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';

import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import { buildChartGeometry } from '../../lib/chart-geometry';
import type { FinanceTrendId } from '../../lib/trends';

const WIDTH = 76;
const HEIGHT = 38;
const BAR_GAP = 3;
const MIN_BAR = 3;
const GAUGE_SIZE = 38;

export type FinInlineChartVariant = 'gauge' | 'bars' | 'line' | 'steps';

/** Each metric gets its own shape so the trends list does not read as one template. */
export function chartVariantForTrend(id: FinanceTrendId): FinInlineChartVariant {
  switch (id) {
    case 'margin':
      return 'gauge';
    case 'revenue':
      return 'bars';
    case 'costs':
      return 'steps';
    case 'cash':
      return 'line';
    default:
      return 'line';
  }
}

type FinInlineChartProps = {
  values: number[];
  color: string;
  variant: FinInlineChartVariant;
  /** For gauge: 0–1 share to draw on the arc. */
  gaugeShare?: number;
};

export const FinInlineChart = memo(function FinInlineChart({
  values,
  color,
  variant,
  gaugeShare,
}: FinInlineChartProps) {
  const { colors } = useTheme();

  if (variant === 'gauge') {
    return <GaugeChart share={gaugeShare ?? normalizedLast(values)} color={color} />;
  }

  if (variant === 'bars') {
    return <BarChart values={values} color={color} />;
  }

  if (variant === 'steps') {
    return <StepChart values={values} color={colors.foreground} accent={color} />;
  }

  return <LineChart values={values} color={color} muted={colors.mutedForeground} card={colors.card} />;
});

function normalizedLast(values: number[]): number {
  if (values.length === 0) return 0;
  const last = values[values.length - 1] ?? 0;
  return Math.max(0, Math.min(1, last));
}

const GaugeChart = memo(function GaugeChart({
  share,
  color,
}: {
  share: number;
  color: string;
}) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, share));
  const cx = GAUGE_SIZE / 2;
  const cy = GAUGE_SIZE / 2 + 2;
  const r = 14;

  const arcPath = useMemo(() => {
    const path = Skia.Path.Make();
    const start = Math.PI;
    const sweep = Math.PI * clamped;
    path.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, 180, sweep);
    return path;
  }, [clamped, cx, cy, r]);

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, 180, 180);
    return path;
  }, [cx, cy, r]);

  return (
    <View style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
      <Canvas style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
        <Group>
          <Path
            path={trackPath}
            color={withAlpha(colors.mutedForeground, 0.2)}
            style="stroke"
            strokeWidth={5}
            strokeCap="round"
          />
          {clamped > 0.02 ? (
            <Path path={arcPath} color={color} style="stroke" strokeWidth={5} strokeCap="round" />
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
});

const BarChart = memo(function BarChart({ values, color }: { values: number[]; color: string }) {
  const bars = values.slice(-8);
  const max = bars.length > 0 ? Math.max(...bars.map(Math.abs)) : 0;
  const lastIndex = bars.length - 1;
  const barWidth = bars.length > 0 ? (WIDTH - BAR_GAP * (bars.length - 1)) / bars.length : 0;

  if (bars.length <= 1 || max <= 0) {
    return <EmptySlot />;
  }

  return (
    <View
      style={{
        width: WIDTH,
        height: HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        gap: BAR_GAP,
      }}
    >
      <Canvas style={{ width: WIDTH, height: HEIGHT }}>
        <Group>
          {bars.map((value, index) => {
            const h = Math.max(MIN_BAR, (Math.abs(value) / max) * HEIGHT);
            const x = index * (barWidth + BAR_GAP);
            return (
              <RoundedRect
                key={index}
                x={x}
                y={HEIGHT - h}
                width={barWidth}
                height={h}
                r={2}
                color={index === lastIndex ? color : withAlpha(color, 0.32)}
              />
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
});

const StepChart = memo(function StepChart({
  values,
  color,
  accent,
}: {
  values: number[];
  color: string;
  accent: string;
}) {
  const samples = values.slice(-6);
  const max = samples.length > 0 ? Math.max(...samples) : 0;

  if (samples.length <= 1 || max <= 0) {
    return <EmptySlot />;
  }

  const stepW = WIDTH / samples.length;

  const blocks = samples.map((value, index) => ({
    x: index * stepW + 1,
    width: stepW - 2,
    height: Math.max(MIN_BAR, (value / max) * HEIGHT),
    latest: index === samples.length - 1,
  }));

  return (
    <Canvas style={{ width: WIDTH, height: HEIGHT }}>
      <Group>
        {blocks.map((block, index) => (
          <RoundedRect
            key={index}
            x={block.x}
            y={HEIGHT - block.height}
            width={block.width}
            height={block.height}
            r={2}
            color={block.latest ? withAlpha(color, 0.88) : withAlpha(accent, 0.28)}
          />
        ))}
      </Group>
    </Canvas>
  );
});

const LineChart = memo(function LineChart({
  values,
  color,
  muted,
  card,
}: {
  values: number[];
  color: string;
  muted: string;
  card: string;
}) {
  const geometry = useMemo(
    () => buildChartGeometry({ values, width: WIDTH, height: HEIGHT, padTop: 4, padBottom: 4, padX: 3 }),
    [values],
  );

  const linePath = useMemo(
    () => (geometry.line ? Skia.Path.MakeFromSVGString(geometry.line) : null),
    [geometry.line],
  );
  const areaPath = useMemo(
    () => (geometry.area ? Skia.Path.MakeFromSVGString(geometry.area) : null),
    [geometry.area],
  );

  if (!linePath || values.length <= 1) {
    return <EmptySlot />;
  }

  const last = geometry.points[geometry.points.length - 1];

  return (
    <Canvas style={{ width: WIDTH, height: HEIGHT }}>
      <Group>
        {areaPath ? (
          <Path path={areaPath} style="fill">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, HEIGHT)}
              colors={[withAlpha(color, 0.2), withAlpha(color, 0.01)]}
            />
          </Path>
        ) : null}
        <Path
          path={linePath}
          color={withAlpha(color, 0.9)}
          style="stroke"
          strokeWidth={1.75}
          strokeJoin="round"
          strokeCap="round"
        />
        {last ? (
          <>
            <Circle cx={last.x} cy={last.y} r={3} color={card} />
            <Circle cx={last.x} cy={last.y} r={2.25} color={color} />
          </>
        ) : null}
      </Group>
    </Canvas>
  );
});

function EmptySlot() {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: WIDTH, height: HEIGHT, justifyContent: 'center', gap: 5 }}
    >
      <View
        style={{
          height: 13,
          borderRadius: 3,
          backgroundColor: withAlpha(colors.mutedForeground, 0.18),
        }}
      />
      <View
        style={{
          height: 6,
          width: '62%',
          borderRadius: 3,
          backgroundColor: withAlpha(colors.mutedForeground, 0.18),
        }}
      />
    </View>
  );
}
