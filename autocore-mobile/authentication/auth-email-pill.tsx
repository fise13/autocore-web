import { useEffect, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ArrowRightIcon, Loader2Icon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { duration, haptics, radius } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { AUTH_HERO_BUTTON_HEIGHT } from './auth-button-metrics';
import { useAuthPressSpring } from './auth-motion';

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
  const press = useAuthPressSpring(0.9);
  const focusProgress = useDerivedValue(
    () =>
      withTiming(focused ? 1 : 0, {
        duration: duration.fast,
      }),
    [focused],
  );

  const showAction = canSubmit || loading;

  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.ring],
    ),
  }));

  const setFocus = (next: boolean) => {
    setFocused(next);
    onFocusChange?.(next);
  };

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          height: AUTH_HERO_BUTTON_HEIGHT,
          borderRadius: radius.full,
          borderWidth: 1,
          backgroundColor: toneBackground(colors.foreground, isDark ? 0.06 : 0.035),
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 24,
          paddingRight: 8,
          opacity: disabled ? 0.55 : 1,
        },
        focusStyle,
      ]}
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
        <Animated.View
          entering={ZoomIn.duration(duration.fast)}
          exiting={FadeOut.duration(duration.instant)}
        >
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
    </Animated.View>
  );
}
