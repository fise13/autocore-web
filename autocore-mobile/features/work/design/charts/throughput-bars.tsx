import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type ThroughputBarsProps = {
  series: { label: string; value: number }[];
  scheme?: 'light' | 'dark';
  height?: number;
};

export const ThroughputBars = memo(function ThroughputBars({
  series,
  scheme = 'light',
  height = 88,
}: ThroughputBarsProps) {
  const colors = workOsColors(scheme);
  const max = useMemo(() => Math.max(1, ...series.map((s) => s.value)), [series]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: workOsSpace.sm, height }}>
      {series.map((s) => (
        <View key={s.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: '70%',
              height: Math.max(4, (s.value / max) * (height - 20)),
              backgroundColor: colors.stripeBlue,
              borderRadius: workOsRadius.sm,
            }}
          />
          <Text style={[workOsType.caption, { color: colors.inkMuted, marginTop: 4 }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
});
