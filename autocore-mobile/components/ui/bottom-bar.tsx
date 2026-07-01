import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { haptics, layout, spacing } from '@/theme';
import { Text } from './text';

type BottomBarItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onPress: () => void;
};

type BottomBarProps = {
  items: BottomBarItem[];
};

export function BottomBar({ items }: BottomBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingBottom: insets.bottom,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: layout.bottomBarHeight + insets.bottom,
      }}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.active }}
          onPress={() => {
            haptics.selection();
            item.onPress();
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[0.5],
            paddingTop: spacing[2],
          }}
        >
          {item.icon}
          <Text
            variant="caption"
            style={{
              color: item.active ? colors.primary : colors.mutedForeground,
              fontWeight: item.active ? '600' : '400',
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
