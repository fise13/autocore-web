import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import {
  getGoogleOAuthEnv,
  isGoogleOAuthConfigured,
  OAUTH_REDIRECT_PATH,
} from '@/lib/auth/oauth-config';
import {
  canUseNativeGoogleSignIn,
  mapNativeGoogleSignInError,
  signInWithGoogleNative,
} from '@/services/auth/google-sign-in';
import { mapAuthError } from '@/utils/auth-error';

import { AuthOAuthButton } from './auth-oauth-button';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  hero?: boolean;
  onStart?: () => void;
  onSuccess: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
};

function ExpoGoogleSignInButton({
  disabled,
  loading,
  hero,
  onStart,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const { iosClientId, androidClientId, webClientId } = getGoogleOAuthEnv();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      iosClientId,
      androidClientId,
      webClientId,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
    },
    {
      scheme: 'autocoremobile',
      path: OAUTH_REDIRECT_PATH,
    },
  );

  useEffect(() => {
    async function completeGoogleSignIn() {
      if (!response) return;
      if (response.type === 'dismiss' || response.type === 'cancel') return;

      if (response.type !== 'success') {
        if (response.type === 'error') {
          onError(response.error?.message ?? 'Could not sign in with Google.');
        }
        return;
      }

      const idToken =
        ('params' in response && typeof response.params?.id_token === 'string'
          ? response.params.id_token
          : null) ??
        ('authentication' in response && typeof response.authentication?.idToken === 'string'
          ? response.authentication.idToken
          : null);

      if (!idToken) {
        onError('Could not complete Google sign-in. Try again or use email.');
        return;
      }

      try {
        await onSuccess(idToken);
      } catch (error) {
        onError(mapAuthError(error));
      }
    }

    void completeGoogleSignIn();
  }, [onError, onSuccess, response]);

  const onPress = async () => {
    if (!isGoogleOAuthConfigured()) {
      onError('Google sign-in is temporarily unavailable. Try email or Apple.');
      return;
    }

    try {
      onStart?.();
      await promptAsync();
    } catch (error) {
      onError(mapAuthError(error));
    }
  };

  return (
    <AuthOAuthButton
      provider="google"
      label={hero ? 'Continue with Google' : 'Sign in with Google'}
      disabled={disabled || !request}
      loading={loading}
      hero={hero}
      onPress={onPress}
    />
  );
}

export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const onPressNative = async () => {
    if (!isGoogleOAuthConfigured()) {
      props.onError('Google sign-in is temporarily unavailable. Try email or Apple.');
      return;
    }

    try {
      props.onStart?.();
      const idToken = await signInWithGoogleNative();
      await props.onSuccess(idToken);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if ((error as { code?: string }).code === 'auth/cancelled') return;
      }
      props.onError(mapAuthError(mapNativeGoogleSignInError(error)));
    }
  };

  if (canUseNativeGoogleSignIn()) {
    return (
      <AuthOAuthButton
        provider="google"
        label={props.hero ? 'Continue with Google' : 'Sign in with Google'}
        disabled={props.disabled}
        loading={props.loading}
        hero={props.hero}
        onPress={onPressNative}
      />
    );
  }

  return <ExpoGoogleSignInButton {...props} />;
}
