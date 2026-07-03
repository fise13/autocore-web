import { Platform } from 'react-native';

export type GoogleOAuthEnv = {
  iosClientId: string;
  androidClientId: string;
  webClientId: string;
};

export function getGoogleOAuthEnv(): GoogleOAuthEnv {
  return {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID?.trim() ?? '',
  };
}

export function isGoogleOAuthConfigured(): boolean {
  const { iosClientId, androidClientId, webClientId } = getGoogleOAuthEnv();
  if (!webClientId) return false;
  if (Platform.OS === 'ios') return Boolean(iosClientId);
  if (Platform.OS === 'android') return Boolean(androidClientId);
  return true;
}

export function googleIosUrlScheme(iosClientId: string): string | null {
  const trimmed = iosClientId.trim();
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const clientKey = trimmed.slice(0, -suffix.length);
  if (!clientKey) return null;
  return `com.googleusercontent.apps.${clientKey}`;
}

export const OAUTH_REDIRECT_PATH = 'oauthredirect';
