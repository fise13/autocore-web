import { AuthOAuthButton } from './auth-oauth-button';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  hero?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({ disabled, loading, hero, onPress }: AppleSignInButtonProps) {
  return (
    <AuthOAuthButton
      provider="apple"
      label={hero ? 'Continue with Apple' : 'Sign in with Apple'}
      disabled={disabled}
      loading={loading}
      hero={hero}
      onPress={onPress}
    />
  );
}

export async function resolveAppleSignInEnabled(): Promise<boolean> {
  const { isAppleSignInAvailable } = await import('@/services/auth/apple-sign-in');
  return isAppleSignInAvailable();
}
