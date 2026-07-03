import { TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { SearchIcon } from '@/assets/icons';
import { useReducedMotion, useTheme } from '@/hooks';

import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersSpring, ordersTimeline } from '../animation/orders-timeline';
import { ordersLayout } from '../layout';

type OrdersSearchProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function OrdersSearch({ value, onChangeText }: OrdersSearchProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const focused = useSharedValue(0);
  const enterStyle = useOrdersEnter({ delay: ordersTimeline.search, translateY: 8, duration: 300 });

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focused.value * 0.008 }],
    minHeight: ordersLayout.searchHeight + focused.value * 4,
    borderColor: interpolateColor(focused.value, [0, 1], [colors.border, colors.primary]),
  }));

  const onFocusChange = (isFocused: boolean) => {
    if (reduced) {
      focused.value = isFocused ? 1 : 0;
      return;
    }
    focused.value = withSpring(isFocused ? 1 : 0, ordersSpring.chip);
  };

  return (
    <Animated.View style={[{ paddingHorizontal: ordersLayout.pad }, enterStyle]}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: ordersLayout.searchHeight,
            borderRadius: ordersLayout.radius,
            borderWidth: ordersLayout.hairline,
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            gap: 8,
          },
          shellStyle,
        ]}
      >
        <SearchIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Поиск: клиент, номер, авто…"
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ flex: 1, fontSize: 15, color: colors.foreground, paddingVertical: 0 }}
        />
      </Animated.View>
    </Animated.View>
  );
}
