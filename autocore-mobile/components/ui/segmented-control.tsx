import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks';
import { haptics, layout, radius, spacing } from '@/theme';
import { Text } from './text';

type Segment = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  segments: Segment[];
  value: string;
  onValueChange: (value: string) => void;
};

/** Mirrors .autocore-segmented-tabs */
export function SegmentedControl({ segments, value, onValueChange }: SegmentedControlProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        height: layout.segmentedControl.height,
        borderRadius: layout.segmentedControl.borderRadius,
        backgroundColor: `${colors.muted}CC`,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing[0.5],
        position: 'relative',
      }}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => {
              haptics.selection();
              onValueChange(segment.value);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: active ? colors.card : 'transparent',
              zIndex: 1,
            }}
          >
            <Text
              variant="buttonSmall"
              style={{
                color: active ? colors.foreground : colors.mutedForeground,
                fontWeight: active ? '600' : '500',
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
