import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, View } from 'react-native';

import { AUTH_BUTTON_HEIGHT, AUTH_BUTTON_RADIUS } from '@/authentication/auth-button-metrics';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks';
import { AppleIcon } from '@/authentication/auth-brand-icons';
import { isAppleSignInAvailable } from '@/services/auth/apple-sign-in';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({ disabled, loading, onPress }: AppleSignInButtonProps) {
  const { colors, isDark } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View
        style={{ width: '100%', height: AUTH_BUTTON_HEIGHT, opacity: disabled || loading ? 0.55 : 1 }}
        pointerEvents={disabled || loading ? 'none' : 'auto'}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={AUTH_BUTTON_RADIUS}
          style={{ width: '100%', height: AUTH_BUTTON_HEIGHT }}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <Button
      size="default"
      variant="outline"
      disabled={disabled || loading}
      loading={loading}
      onPress={onPress}
      leftIcon={<AppleIcon color={colors.foreground} />}
      style={{ width: '100%', height: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS }}
    >
      Продолжить с Apple
    </Button>
  );
}

export async function resolveAppleSignInEnabled(): Promise<boolean> {
  return isAppleSignInAvailable();
}
