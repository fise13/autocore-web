import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { autocoreEase, duration, spacing } from '@/theme';

type CoAmountFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Currency mark shown inside the field, e.g. `₸`. */
  currency: string;
  /** Drives the sign glyph and its tone. */
  direction: 'in' | 'out';
  autoFocus?: boolean;
};

/**
 * The amount is the reason this screen exists, so it gets display-sized type,
 * a numeric keypad, and the currency inline — no label, no guessing.
 */
export function CoAmountField({
  value,
  onChangeText,
  currency,
  direction,
  autoFocus = false,
}: CoAmountFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const empty = value.trim().length === 0;
  const tone = direction === 'in' ? colors.success : colors.foreground;

  const underlineStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(focused ? colors.primary : colors.borderMuted, {
      duration: duration.fast,
      easing: autocoreEase,
    }),
    height: withTiming(focused ? 2 : 1, { duration: duration.fast, easing: autocoreEase }),
  }));

  return (
    <View style={{ gap: spacing[1.5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] }}>
        <Text
          variant="pageTitle"
          style={{
            fontSize: 34,
            lineHeight: 42,
            fontWeight: '300',
            color: empty ? colors.mutedForeground : tone,
          }}
        >
          {direction === 'in' ? '+' : '−'}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Amount"
          selectionColor={colors.primary}
          style={{
            flex: 1,
            fontSize: 34,
            lineHeight: 42,
            fontWeight: '700',
            letterSpacing: -1,
            color: colors.foreground,
            padding: 0,
          }}
        />

        <Text
          variant="pageTitle"
          style={{
            fontSize: 22,
            lineHeight: 30,
            fontWeight: '600',
            color: colors.mutedForeground,
          }}
        >
          {currency}
        </Text>
      </View>

      <Animated.View style={[{ borderRadius: 1 }, underlineStyle]} />
    </View>
  );
}
