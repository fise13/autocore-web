import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePressAnimation } from '@/animations';
import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration, haptics } from '@/theme';

type JourneyOptionCardProps = {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Stagger index for enter animation. */
  index?: number;
  accessibilityLabel?: string;
};

/** Selectable journey row with press scale + staggered enter. */
export function JourneyOptionCard({
  children,
  onPress,
  selected = false,
  disabled = false,
  style,
  index = 0,
  accessibilityLabel,
}: JourneyOptionCardProps) {
  const reducedMotion = useReducedMotion();
  const press = usePressAnimation(0.98);
  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.normal)
        .delay(Math.min(index, 6) * 45)
        .easing(autocoreEase);

  return (
    <Animated.View entering={entering}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        <Animated.View style={[style, press.style]}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  );
}
