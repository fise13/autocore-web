import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressAnimation } from '@/animations';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, radius } from '@/theme';

import { AppleIcon, GoogleIcon } from './auth-brand-icons';
import {
  AUTH_BUTTON_FONT_SIZE,
  AUTH_BUTTON_HEIGHT,
  AUTH_BUTTON_ICON_SIZE,
  AUTH_BUTTON_LINE_HEIGHT,
  AUTH_BUTTON_RADIUS,
  AUTH_HERO_BUTTON_FONT_SIZE,
  AUTH_HERO_BUTTON_HEIGHT,
  AUTH_HERO_BUTTON_ICON_SIZE,
  AUTH_HERO_BUTTON_LINE_HEIGHT,
} from './auth-button-metrics';
import { getOAuthButtonTheme } from './auth-oauth-theme';

type AuthOAuthButtonProps = {
  provider: 'google' | 'apple';
  label: string;
  disabled?: boolean;
  loading?: boolean;
  /** Tall full-radius pill used on the login landing screen. */
  hero?: boolean;
  onPress: () => void;
};

export function AuthOAuthButton({
  provider,
  label,
  disabled = false,
  loading = false,
  hero = false,
  onPress,
}: AuthOAuthButtonProps) {
  const { scheme } = useTheme();
  const theme = getOAuthButtonTheme(provider, scheme);
  const isGoogle = provider === 'google';
  const press = usePressAnimation(0.97);

  const height = hero ? AUTH_HERO_BUTTON_HEIGHT : AUTH_BUTTON_HEIGHT;
  const iconSize = hero ? AUTH_HERO_BUTTON_ICON_SIZE : AUTH_BUTTON_ICON_SIZE;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.container,
            hero ? null : theme.shadow,
            {
              height,
              borderRadius: hero ? radius.full : AUTH_BUTTON_RADIUS,
              backgroundColor:
                pressed && !disabled ? theme.pressedBackgroundColor : theme.backgroundColor,
              borderColor: theme.borderColor,
              opacity: disabled ? 0.55 : 1,
            },
            press.style,
          ]}
        >
          <View style={styles.content}>
            <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.foregroundColor} />
              ) : isGoogle ? (
                <GoogleIcon size={iconSize} />
              ) : (
                <AppleIcon size={iconSize} color={theme.foregroundColor} />
              )}
            </View>
            <Text
              variant="body"
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: theme.foregroundColor,
                  fontSize: hero ? AUTH_HERO_BUTTON_FONT_SIZE : AUTH_BUTTON_FONT_SIZE,
                  lineHeight: hero ? AUTH_HERO_BUTTON_LINE_HEIGHT : AUTH_BUTTON_LINE_HEIGHT,
                  fontWeight: hero ? '700' : '600',
                },
              ]}
            >
              {label}
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  container: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    letterSpacing: -0.1,
  },
});
