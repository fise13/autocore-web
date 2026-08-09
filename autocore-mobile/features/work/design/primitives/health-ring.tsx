import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { RING_COLOR_KEY, workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace } from '../tokens/space';

export type HealthRingProps = {
  label: string;
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: keyof typeof RING_COLOR_KEY;
  scheme?: 'light' | 'dark';
  caption?: string;
};

export const HealthRing = memo(function HealthRing({
  label,
  value,
  max = 1,
  size = 96,
  stroke = 10,
  tone = 'open',
  scheme = 'light',
  caption,
}: HealthRingProps) {
  const colors = workOsColors(scheme);
  const colorKey = RING_COLOR_KEY[tone] ?? 'ringOpen';
  const strokeColor = colors[colorKey];
  const progress = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  const center = useMemo(() => ({ value: Math.round(value), label }), [value, label]);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${center.value}${caption ? `, ${caption}` : ''}`}
      style={{ width: size + 8, alignItems: 'center' }}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.skeleton} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={strokeColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[workOsType.metricSm, { color: colors.ink }]}>{center.value}</Text>
        </View>
      </View>
      <Text style={[workOsType.caption, { color: colors.inkMuted, marginTop: workOsSpace.xs }]}>{label}</Text>
      {caption ? <Text style={[workOsType.footnote, { color: colors.inkSecondary }]}>{caption}</Text> : null}
    </View>
  );
});
