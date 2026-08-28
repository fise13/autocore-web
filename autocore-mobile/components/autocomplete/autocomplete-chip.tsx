import { memo, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutRight } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

import {
  AutocompleteChipCopy,
  autocompleteChipTitle,
  chipOutOfStock,
  type AutocompleteChipProps,
} from './autocomplete-chip-copy';

/** Android / default — solid badge, no blur. */
export const AutocompleteChip = memo(function AutocompleteChip({
  option,
  index,
  onPress,
}: AutocompleteChipProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const outOfStock = chipOutOfStock(option);
  const [pressed, setPressed] = useState(false);

  const entering = reducedMotion
    ? FadeIn.duration(120)
    : FadeInRight.duration(tokens.autocomplete.enterMs).delay(
        index * tokens.autocomplete.staggerMs,
      );
  const exiting = reducedMotion
    ? undefined
    : FadeOutRight.duration(tokens.motion.duration.instant);

  return (
    <Animated.View entering={entering} exiting={exiting}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={autocompleteChipTitle(option)}
        accessibilityHint="Applies this suggestion"
        disabled={outOfStock}
        onPressIn={() => {
          if (!outOfStock) setPressed(true);
        }}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        style={{
          minHeight: tokens.control.hitTarget,
          paddingHorizontal: tokens.autocomplete.chipPadH,
          paddingVertical: tokens.autocomplete.chipPadV,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.secondary,
          opacity: outOfStock ? tokens.opacity.disabled : pressed ? 0.7 : 1,
        }}
      >
        <AutocompleteChipCopy option={option} />
      </Pressable>
    </Animated.View>
  );
});
