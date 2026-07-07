import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { AppleIcon, GoogleIcon } from './auth-brand-icons';
import { AUTH_BUTTON_HEIGHT, AUTH_BUTTON_RADIUS } from './auth-button-metrics';

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
  const { colors, isDark } = useTheme();
  const isGoogle = provider === 'google';

  const backgroundColor = isGoogle
    ? isDark
      ? colors.card
      : '#ffffff'
    : isDark
      ? '#ffffff'
      : '#000000';

  const foregroundColor = isGoogle
    ? isDark
      ? colors.foreground
      : '#1f1f1f'
    : isDark
      ? '#000000'
      : '#ffffff';

  const borderColor = isGoogle ? colors.border : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.65 : pressed ? 0.92 : 1,
          transform: [{ translateY: pressed && !disabled ? 1 : 0 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foregroundColor} />
      ) : (
        <View style={styles.icon}>
          {isGoogle ? (
            <GoogleIcon size={16} />
          ) : (
            <AppleIcon size={16} color={foregroundColor} />
          )}
        </View>
      )}
      <Text variant="body" style={[styles.label, { color: foregroundColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: AUTH_BUTTON_HEIGHT,
    borderRadius: AUTH_BUTTON_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  icon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
