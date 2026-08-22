import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin } from '../../layout';

/** Two-column legend above a featured chart — Health Highlights pattern. */
export function FinChartLegend({
  columns,
}: {
  columns: Array<{
    label: string;
    value: string;
    dotColor: string;
    valueColor?: string;
  }>;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: fin.block }}>
      {columns.map((column) => (
        <View key={column.label} style={{ gap: 1, flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.micro + 1 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: column.dotColor,
              }}
            />
            <Text variant="caption1" style={{ color: column.valueColor ?? colors.mutedForeground }}>
              {column.label}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: 20,
              lineHeight: 25,
              fontWeight: '600',
              letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
              color: column.valueColor ?? colors.mutedForeground,
            }}
          >
            {column.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
