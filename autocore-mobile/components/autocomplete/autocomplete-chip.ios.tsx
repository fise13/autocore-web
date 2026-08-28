import { memo, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutRight } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { autocompleteGlass } from '@/theme/autocomplete';
import { tokens } from '@/theme/tokens';

import { AutocompleteGlassPlate } from './autocomplete-glass-plate';
import {
  AutocompleteChipCopy,
  autocompleteChipTitle,
  chipOutOfStock,
  type AutocompleteChipProps,
} from './autocomplete-chip-copy';

/**
 * iOS chip. Enter on the outer wrapper — the plate is BlurView + fill,
 * not UIGlassEffect, so opacity animations stay safe.
 */
export const AutocompleteChip = memo(function AutocompleteChip({
  option,
  index,
  onPress,
}: AutocompleteChipProps) {
  const { colors, scheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const glass = autocompleteGlass(colors, scheme);
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
    <Animated.View entering={entering} exiting={exiting} style={glass.shadow}>
      <AutocompleteGlassPlate>
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
            opacity: outOfStock ? tokens.opacity.disabled : pressed ? 0.7 : 1,
          }}
        >
          <AutocompleteChipCopy option={option} />
        </Pressable>
      </AutocompleteGlassPlate>
    </Animated.View>
  );
});
