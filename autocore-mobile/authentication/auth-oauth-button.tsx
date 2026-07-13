import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { AppleIcon, GoogleIcon } from './auth-brand-icons';
import {
  AUTH_BUTTON_FONT_SIZE,
  AUTH_BUTTON_HEIGHT,
  AUTH_BUTTON_ICON_SIZE,
  AUTH_BUTTON_LINE_HEIGHT,
  AUTH_BUTTON_RADIUS,
} from './auth-button-metrics';
import { getOAuthButtonTheme } from './auth-oauth-theme';

type AuthOAuthButtonProps = {
  provider: 'google' | 'apple';
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function AuthOAuthButton({
  provider,
  label,
  disabled = false,
  loading = false,
  onPress,
}: AuthOAuthButtonProps) {
  const { scheme } = useTheme();
  const theme = getOAuthButtonTheme(provider, scheme);
  const isGoogle = provider === 'google';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.container,
            theme.shadow,
            {
              backgroundColor:
                pressed && !disabled ? theme.pressedBackgroundColor : theme.backgroundColor,
              borderColor: theme.borderColor,
              opacity: disabled ? 0.65 : 1,
              transform: [{ translateY: pressed && !disabled ? 1 : 0 }],
            },
          ]}
        >
          <View style={styles.content}>
            <View style={styles.iconSlot}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.foregroundColor} />
              ) : isGoogle ? (
                <GoogleIcon size={AUTH_BUTTON_ICON_SIZE} />
              ) : (
                <AppleIcon size={AUTH_BUTTON_ICON_SIZE} color={theme.foregroundColor} />
              )}
            </View>
            <Text
              variant="body"
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: theme.foregroundColor,
                },
              ]}
            >
              {label}
            </Text>
          </View>
        </View>
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
    height: AUTH_BUTTON_HEIGHT,
    borderRadius: AUTH_BUTTON_RADIUS,
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
  iconSlot: {
    width: AUTH_BUTTON_ICON_SIZE,
    height: AUTH_BUTTON_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: AUTH_BUTTON_FONT_SIZE,
    fontWeight: '600',
    lineHeight: AUTH_BUTTON_LINE_HEIGHT,
    letterSpacing: -0.1,
  },
});
