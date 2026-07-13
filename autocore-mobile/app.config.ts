import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleModularHeaders = require('./plugins/with-google-modular-headers');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleIosUrlScheme = require('./plugins/with-google-ios-url-scheme');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withOptionalAppleSignIn = require('./plugins/with-optional-apple-sign-in');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withDisableSwiftUICoreAutolink = require('./plugins/with-disable-swiftuicore-autolink');

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

// Apple Sign In is required when Google is offered (App Store guideline 4.8).
// Opt out only with EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=0|false.
const appleSignInFlag = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN?.trim().toLowerCase();
const appleSignInEnabled = appleSignInFlag !== '0' && appleSignInFlag !== 'false';

const universalLinksFlag = process.env.EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS?.trim().toLowerCase();
const universalLinksEnabled = universalLinksFlag === '1' || universalLinksFlag === 'true';

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
      cameraPermission: 'AutoCore использует камеру для сканирования штрихкодов.',
      barcodeScannerEnabled: true,
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission: 'AutoCore использует фото для импорта кодов из галереи.',
    },
  ],
  'expo-sharing',
  [
    'expo-notifications',
    {
      icon: './assets/branding/login-logo.png',
      color: '#0d0e12',
    },
  ],
];

if (appleSignInEnabled) {
  plugins.splice(2, 0, 'expo-apple-authentication');
}

if (iosUrlScheme) {
  plugins.splice(3, 0, ['@react-native-google-signin/google-signin', { iosUrlScheme }]);
}

plugins.push(
  withGoogleModularHeaders,
  withGoogleIosUrlScheme,
  withOptionalAppleSignIn,
  withDisableSwiftUICoreAutolink,
  require('./plugins/with-ios-push-entitlements'),
  require('./plugins/with-ios-universal-links'),
);

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
    appleTeamId: '45W7LA3QFP',
    ...(universalLinksEnabled ? { associatedDomains: ['applinks:app.myautocore.com'] } : {}),
    ...(appleSignInEnabled ? { usesAppleSignIn: true } : {}),
    bundleIdentifier: 'com.wise.autocore.mobile',
    icon: './assets/branding/login-logo.png',
    infoPlist: {
      NSUserNotificationsUsageDescription:
        'AutoCore отправляет уведомления о нарядах, складе, платежах и других событиях вашей компании.',
      ...(iosUrlScheme
        ? {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: [iosUrlScheme, 'autocoremobile'],
              },
            ],
          }
        : {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: ['autocoremobile'],
              },
            ],
          }),
    },
  },
  android: {
    package: 'com.wise.autocore.mobile',
    adaptiveIcon: {
      backgroundColor: '#0d0e12',
      foregroundImage: './assets/branding/login-logo.png',
      monochromeImage: './assets/branding/login-logo.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'app.myautocore.com',
            pathPrefix: '/invite',
          },
          {
            scheme: 'https',
            host: 'app.myautocore.com',
            pathPrefix: '/join',
          },
          {
            scheme: 'https',
            host: 'app.myautocore.com',
            pathPrefix: '/import',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
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
  extra: {
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
        'f13cbd47-6bc7-4eb4-b4ad-12dc7175018a',
    },
  },
});
