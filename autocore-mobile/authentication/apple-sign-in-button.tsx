import { AuthOAuthButton } from './auth-oauth-button';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({ disabled, loading, onPress }: AppleSignInButtonProps) {
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
  const { isAppleSignInAvailable } = await import('@/services/auth/apple-sign-in');
  return isAppleSignInAvailable();
}
