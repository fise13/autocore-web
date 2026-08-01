import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { PlusIcon } from '@/assets/icons';
import { useReducedMotion, useTheme } from '@/hooks';
import { NATIVE_TAB_BAR_HEIGHT } from '@/lib/navigation/floating-tab-bar-inset';
import { spring } from '@/theme/animations';
import { autocoreEase, duration } from '@/theme/motion';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

export const ORDERS_FAB_SIZE = 56;
/** Breathing room between the FAB and the tab bar below it. */
const FAB_GAP = 14;

type OrdersCreateFabProps = {
  onPress: () => void;
};

/** Clearance a scroll view needs so its last row never hides under the FAB. */
export function ordersFabScrollClearance(): number {
  return ORDERS_FAB_SIZE + FAB_GAP;
}

/**
 * The one thing you come to this screen to do, kept under the thumb.
 *
 * The native tab bar cannot report its height, so the offset is derived from
 * the same constant the sticky footers use.
 */
export function OrdersCreateFab({ onPress }: OrdersCreateFabProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const bottom = Math.max(insets.bottom, 12) + NATIVE_TAB_BAR_HEIGHT + FAB_GAP;

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.44 : 0.22,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  });

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 16, bottom, zIndex: 20 }}
    >
      <Animated.View
        entering={
          reducedMotion
            ? undefined
            : ZoomIn.duration(duration.medium)
                .easing(autocoreEase)
                .springify()
                .damping(spring.snappy.damping)
        }
        exiting={reducedMotion ? undefined : FadeOut.duration(duration.fast)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New work order"
          onPress={() => {
            haptics.medium();
            onPress();
          }}
          style={({ pressed }) => ({
            width: ORDERS_FAB_SIZE,
            height: ORDERS_FAB_SIZE,
            borderRadius: ORDERS_FAB_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderWidth: 1,
            borderColor: withAlpha('#FFFFFF', isDark ? 0.18 : 0.3),
            ...shadow,
          })}
        >
          <SymbolView
            name="plus"
            size={26}
            weight="semibold"
            tintColor={colors.primaryForeground}
            fallback={
              <PlusIcon size="lg" color={colors.primaryForeground} strokeWidth={2.4} />
            }
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}
