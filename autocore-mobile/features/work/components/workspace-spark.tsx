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

import { workLayout } from '../layout';
import type { WorkspaceSeries } from '../lib/workspace-series';

const WIDTH = workLayout.sparkWidth;
const HEIGHT = workLayout.sparkHeight;

/** Keeps the end dot and the stroke off the canvas edge. */
const INSET = 3;
const BAR_GAP = 2;
const MIN_BAR = 2;

type Geometry =
  | { kind: 'line'; stroke: string; area: string | null; endX: number; endY: number }
  | {
      kind: 'bars';
      bars: Array<{ x: number; y: number; height: number; empty: boolean; latest: boolean }>;
      barWidth: number;
    };

function lineGeometry(points: number[]): Extract<Geometry, { kind: 'line' }> {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const flat = max === min;
  const plotW = WIDTH - INSET * 2;
  const plotH = HEIGHT - INSET * 2;

  const xAt = (index: number) =>
    points.length <= 1 ? WIDTH / 2 : INSET + (index / (points.length - 1)) * plotW;
  // A catalog that has not moved in eight weeks is a real answer, but drawing
  // it on the floor would read as zero. Flat series sit mid-height instead.
  const yAt = (value: number) =>
    flat ? HEIGHT / 2 : INSET + (1 - (value - min) / (max - min)) * plotH;

  const coords = points.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const stroke = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const last = coords[coords.length - 1]!;

  return {
    kind: 'line',
    stroke,
    // Filling under a flat line turns "steady" into a solid block that reads
    // like a bar. A bare rule says the same thing without the weight.
    area: flat ? null : `${stroke} L ${last.x} ${HEIGHT} L ${coords[0]!.x} ${HEIGHT} Z`,
    endX: last.x,
    endY: last.y,
  };
}

function barGeometry(points: number[]): Extract<Geometry, { kind: 'bars' }> {
  const count = points.length;
  const barWidth = Math.max(2, (WIDTH - BAR_GAP * (count - 1)) / count);
  const max = Math.max(...points);

  const bars = points.map((value, index) => {
    // A week with nothing in it still gets a stub, so the axis reads as eight
    // weeks with one empty rather than as a gap in the chart.
    const height = value <= 0 ? MIN_BAR : Math.max(MIN_BAR, (value / max) * HEIGHT);
    return {
      x: index * (barWidth + BAR_GAP),
      y: HEIGHT - height,
      height,
      empty: value <= 0,
      latest: index === count - 1,
    };
  });

  return { kind: 'bars', bars, barWidth };
}

/**
 * The trailing chart on a workspace row.
 *
 * Two shapes, because the data has two shapes. A `level` — open orders, a
 * catalog count — is a quantity that exists continuously, so it gets a line.
 * A `flow` — engines booked in, stock received, payouts recorded — is a pile of
 * events per week, so it gets bars. Reading a flow as a line would imply values
 * between the weeks that were never measured.
 *
 * `accent` is the row's own detail colour, so a row that has gone blue for
 * attention takes its chart with it instead of arguing with itself.
 */
export const WorkspaceSpark = memo(function WorkspaceSpark({
  series,
  accent,
}: {
  series: WorkspaceSeries | null;
  accent: string;
}) {
  const { colors } = useTheme();

  const geometry = useMemo<Geometry | null>(() => {
    if (!series || series.points.length === 0) return null;
    return series.shape === 'level' ? lineGeometry(series.points) : barGeometry(series.points);
  }, [series]);

  const strokePath = useMemo(
    () => (geometry?.kind === 'line' ? Skia.Path.MakeFromSVGString(geometry.stroke) : null),
    [geometry],
  );
  const areaPath = useMemo(
    () =>
      geometry?.kind === 'line' && geometry.area
        ? Skia.Path.MakeFromSVGString(geometry.area)
        : null,
    [geometry],
  );

  // Nothing to draw: locations carry no timestamps, Document import has no
  // listener, and a queue whose listener has not answered yet is unknown rather
  // than empty.
  //
  // Deliberately dashed. A solid rule at mid-height is exactly what a flat
  // level looks like — "500 motors, unchanged" and "we have no idea" would have
  // been the same picture.
  if (!geometry) {
    return (
      <View
        style={{
          width: WIDTH,
          height: HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={`dash-${index}`}
            style={{
              width: 6,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: withAlpha(colors.mutedForeground, 0.28),
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <Canvas style={{ width: WIDTH, height: HEIGHT }}>
      {geometry.kind === 'bars' ? (
        <Group>
          {geometry.bars.map((bar, index) => (
            <RoundedRect
              key={`bar-${index}`}
              x={bar.x}
              y={bar.y}
              width={geometry.barWidth}
              height={bar.height}
              r={Math.min(1.75, geometry.barWidth / 2)}
              // The newest week is marked even when it is empty — that stub is
              // "so far this week", not a week we have no reading for.
              color={bar.latest ? accent : withAlpha(accent, bar.empty ? 0.18 : 0.4)}
            />
          ))}
        </Group>
      ) : (
        <Group>
          {areaPath ? (
            <Path path={areaPath} style="fill">
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, HEIGHT)}
                colors={[withAlpha(accent, 0.26), withAlpha(accent, 0.01)]}
              />
            </Path>
          ) : null}
          {strokePath ? (
            <Path
              path={strokePath}
              color={withAlpha(accent, 0.9)}
              style="stroke"
              strokeWidth={1.75}
              strokeJoin="round"
              strokeCap="round"
            />
          ) : null}
          {/* The latest week, marked the way Health marks the current reading. */}
          <Circle cx={geometry.endX} cy={geometry.endY} r={2.25} color={accent} />
        </Group>
      )}
    </Canvas>
  );
});
