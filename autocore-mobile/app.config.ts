import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleModularHeaders = require('./plugins/with-google-modular-headers');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleIosUrlScheme = require('./plugins/with-google-ios-url-scheme');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withOptionalAppleSignIn = require('./plugins/with-optional-apple-sign-in');

function googleIosUrlScheme(iosClientId: string): string | null {
  const trimmed = iosClientId.trim();
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const clientKey = trimmed.slice(0, -suffix.length);
  if (!clientKey) return null;
  return `com.googleusercontent.apps.${clientKey}`;
}

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
const iosUrlScheme = googleIosUrlScheme(iosClientId);

const appleSignInEnabled =
  process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === '1' ||
  process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === 'true';

const plugins: ExpoConfig['plugins'] = [
  'expo-router',
  [
    'expo-splash-screen',
    {
      image: './assets/branding/login-logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      dark: {
        image: './assets/branding/login-logo.png',
        backgroundColor: '#0d0e12',
      },
    },
  ],
  [
    'expo-camera',
    {
      cameraPermission: 'AutoCore использует камеру для сканирования QR, VIN и штрихкодов.',
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission: 'AutoCore использует фото для импорта кодов из галереи.',
    },
  ],
  'expo-sharing',
];

if (appleSignInEnabled) {
  plugins.splice(2, 0, 'expo-apple-authentication');
}

if (iosUrlScheme) {
  plugins.splice(3, 0, ['@react-native-google-signin/google-signin', { iosUrlScheme }]);
}

plugins.push(withGoogleModularHeaders, withGoogleIosUrlScheme, withOptionalAppleSignIn);

export default (): ExpoConfig => ({
  name: 'AutoCore',
  slug: 'autocore-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/branding/login-logo.png',
  scheme: 'autocoremobile',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    ...(appleSignInEnabled ? { usesAppleSignIn: true } : {}),
    bundleIdentifier: 'com.wise.autocore.mobile',
    icon: './assets/branding/login-logo.png',
    ...(iosUrlScheme
      ? {
          infoPlist: {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: [iosUrlScheme, 'autocoremobile'],
              },
            ],
          },
        }
      : {}),
  },
  android: {
    package: 'com.wise.autocore.mobile',
    adaptiveIcon: {
      backgroundColor: '#0d0e12',
      foregroundImage: './assets/branding/login-logo.png',
      monochromeImage: './assets/branding/login-logo.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/branding/login-logo.png',
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
});
