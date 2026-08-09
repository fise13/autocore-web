import { memo } from 'react';
import { ScrollView, View, Text } from 'react-native';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type KpiItem = {
  id: string;
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
};

export type KPIStripProps = {
  items: KpiItem[];
  scheme?: 'light' | 'dark';
};

export const KPIStrip = memo(function KPIStrip({ items, scheme = 'light' }: KPIStripProps) {
  const colors = workOsColors(scheme);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: workOsSpace.sm, paddingHorizontal: workOsSpace.screenX }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            minWidth: 120,
            padding: workOsSpace.md,
            borderRadius: workOsRadius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={[workOsType.caption, { color: colors.inkMuted }]}>{item.label}</Text>
          <Text style={[workOsType.metricSm, { color: colors.ink, marginTop: 4 }]}>{item.value}</Text>
          {item.delta ? (
            <Text style={[workOsType.footnote, { color: item.positive === false ? colors.kpiNegative : colors.kpiPositive, marginTop: 2 }]}>
              {item.delta}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
});
