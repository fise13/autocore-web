import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ArrowRightIcon, Loader2Icon } from '@/assets/icons';
import { usePressAnimation } from '@/animations';
import { useTheme } from '@/hooks';
import { haptics, radius } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { AUTH_HERO_BUTTON_HEIGHT } from './auth-button-metrics';

function PillSpinner({ color }: { color: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={style}>
      <Loader2Icon size="sm" color={color} />
    </Animated.View>
  );
}

type AuthEmailPillProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  /** Shows the submit affordance — the caller owns email validation. */
  canSubmit: boolean;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onFocusChange?: (focused: boolean) => void;
};

/** Email entry styled as a pill to sit under the hero OAuth buttons. */
export function AuthEmailPill({
  value,
  onChangeText,
  onSubmit,
  canSubmit,
  loading = false,
  disabled = false,
  placeholder = 'Personal or work email',
  onFocusChange,
}: AuthEmailPillProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const press = usePressAnimation(0.9);

  const showAction = canSubmit || loading;

  const setFocus = (next: boolean) => {
    setFocused(next);
    onFocusChange?.(next);
  };

  return (
    <View
      style={{
        width: '100%',
        height: AUTH_HERO_BUTTON_HEIGHT,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: focused ? colors.ring : colors.border,
        backgroundColor: toneBackground(colors.foreground, isDark ? 0.06 : 0.035),
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 8,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        editable={!disabled && !loading}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
        style={{
          flex: 1,
          fontSize: 17,
          color: colors.foreground,
          paddingVertical: 0,
        }}
      />

      {showAction ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
            disabled={disabled || loading || !canSubmit}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            onPress={() => {
              haptics.selection();
              onSubmit();
            }}
          >
            <Animated.View
              style={[
                {
                  width: 42,
                  height: 42,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                },
                press.style,
              ]}
            >
              {loading ? (
                <PillSpinner color={colors.primaryForeground} />
              ) : (
                <ArrowRightIcon size="sm" color={colors.primaryForeground} />
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
