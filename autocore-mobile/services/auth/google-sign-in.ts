import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getGoogleOAuthEnv } from '@/lib/auth/oauth-config';

let configured = false;

export function canUseNativeGoogleSignIn(): boolean {
  return Constants.appOwnership !== 'expo';
}

export function configureNativeGoogleSignIn(): void {
  if (configured || !canUseNativeGoogleSignIn()) return;

  const { webClientId, iosClientId } = getGoogleOAuthEnv();
  if (!webClientId) return;

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });
  configured = true;
}

export async function signInWithGoogleNative(): Promise<string> {
  configureNativeGoogleSignIn();

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw Object.assign(new Error('Google sign-in was cancelled.'), { code: 'auth/cancelled' });
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return a sign-in token. Check webClientId in Firebase/Google Cloud.');
  }

  return idToken;
}

export function mapNativeGoogleSignInError(error: unknown): Error {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code);
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return Object.assign(new Error('Google sign-in was cancelled.'), { code: 'auth/cancelled' });
    }
    if (code === statusCodes.IN_PROGRESS) {
      return new Error('Google sign-in is already in progress.');
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Google Play Services are not available on this device.');
    }
  }

  return error instanceof Error ? error : new Error('Could not sign in with Google.');
}
