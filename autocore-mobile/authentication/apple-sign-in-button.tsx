import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, View } from 'react-native';

import { AUTH_BUTTON_HEIGHT, AUTH_BUTTON_RADIUS } from '@/authentication/auth-button-metrics';
import { useTheme } from '@/hooks';
import { isAppleSignInAvailable } from '@/services/auth/apple-sign-in';

import { AuthOAuthButton } from './auth-oauth-button';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({ disabled, loading, onPress }: AppleSignInButtonProps) {
  const { isDark } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View
        style={{ width: '100%', height: AUTH_BUTTON_HEIGHT, opacity: disabled || loading ? 0.55 : 1 }}
        pointerEvents={disabled || loading ? 'none' : 'auto'}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
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
    <AuthOAuthButton
      provider="apple"
      label="Войти через Apple"
      disabled={disabled}
      loading={loading}
      onPress={onPress}
    />
  );
}

export async function resolveAppleSignInEnabled(): Promise<boolean> {
  return isAppleSignInAvailable();
}
