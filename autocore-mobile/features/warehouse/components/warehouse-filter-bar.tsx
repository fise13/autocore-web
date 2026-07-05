import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { useSearchEnter } from '@/features/search/animation';

import { whTimeline } from '../animation/timeline';
import { wh } from '../layout';

export type WarehouseFilter = 'all' | 'low';

type WarehouseFilterBarProps = {
  value: WarehouseFilter;
  onChange: (next: WarehouseFilter) => void;
};

const OPTIONS: Array<{ id: WarehouseFilter; label: string }> = [
  { id: 'all', label: 'Все позиции' },
  { id: 'low', label: 'На исходе' },
];

export function WarehouseFilterBar({ value, onChange }: WarehouseFilterBarProps) {
  const { colors } = useTheme();
  const style = useSearchEnter({ delay: whTimeline.toolbar, translateY: 8, duration: 280 });

  return (
    <Animated.View style={[{ paddingHorizontal: wh.pad, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {OPTIONS.map((option) => {
          const active = option.id === value;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              onPress={() => {
                if (active) return;
                haptics.selection();
                onChange(option.id);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.sidebarAccent,
                borderWidth: wh.hairline,
                borderColor: active ? colors.primary : colors.borderMuted,
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: '600',
                  color: active ? colors.primaryForeground : colors.mutedForeground,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
