import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleModularHeaders = require('./plugins/with-google-modular-headers');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withGoogleIosUrlScheme = require('./plugins/with-google-ios-url-scheme');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withOptionalAppleSignIn = require('./plugins/with-optional-apple-sign-in');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withDisableSwiftUICoreAutolink = require('./plugins/with-disable-swiftuicore-autolink');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withOpenIapPurchasePatch = require('./plugins/with-openiap-purchase-patch');

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

// Universal Links ship by default; opt out only when signing against a profile
// without the Associated Domains capability. Kept in sync with
// `plugins/with-ios-universal-links.js`, which writes the entitlement.
const universalLinksFlag = process.env.EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS?.trim().toLowerCase();
const universalLinksEnabled = universalLinksFlag !== '0' && universalLinksFlag !== 'false';
const associatedDomains = ['applinks:app.myautocore.com', 'applinks:myautocore.com'];

const plugins: ExpoConfig['plugins'] = [
  'expo-router',
  [
    'expo-splash-screen',
    {
      // Solid boot only — no red mark flash. React AuthBrandMark is monochrome.
      backgroundColor: '#ffffff',
      dark: {
        backgroundColor: '#0d0e12',
      },
    },
  ],
  [
    'expo-camera',
    {
      cameraPermission:
        'AutoCore uses the camera to scan barcodes and photograph engines during intake inspection.',
      // Scanning and stills only — no audio is ever recorded, so the app should
      // not ask for the microphone or ship a permission it cannot justify.
      microphonePermission: false,
      barcodeScannerEnabled: true,
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission:
        'AutoCore uses your photo library to import scan codes and add engine documentation photos.',
    },
  ],
  'expo-sharing',
  'expo-task-manager',
  'expo-background-task',
  [
    'expo-notifications',
    {
      icon: './assets/branding/login-logo.png',
      color: '#0d0e12',
    },
  ],
  [
    'expo-widgets',
    {
      // `widgets[]` is for `createWidget` only — the Live Activity registers
      // itself through `createLiveActivity` and must NOT be listed here.
      // Bundle ID must match the App ID already registered in Apple Developer
      // (Xcode created com.wise.autocore.mobile.ExpoWidgetsTarget).
      bundleIdentifier: 'com.wise.autocore.mobile.ExpoWidgetsTarget',
      groupIdentifier: 'group.com.wise.autocore.mobile',
      enablePushNotifications: false,
      widgets: [
        {
          name: 'AutoCoreToday',
          displayName: 'Floor',
          description: 'What needs a person on the floor — stock to place, orders, pay, intake.',
          supportedFamilies: [
            'accessoryCircular',
            'accessoryRectangular',
            'accessoryInline',
            'systemSmall',
            'systemMedium',
            'systemLarge',
          ],
          contentMarginsDisabled: false,
        },
        {
          name: 'AutoCoreScan',
          displayName: 'Scan',
          description: 'Open the camera. Shows stock waiting to be placed.',
          supportedFamilies: ['accessoryCircular', 'systemSmall'],
          contentMarginsDisabled: false,
        },
        {
          name: 'AutoCoreIntake',
          displayName: 'Intake Bay',
          description: 'Engines ready for review and engines still documenting.',
          supportedFamilies: [
            'accessoryCircular',
            'accessoryRectangular',
            'accessoryInline',
            'systemSmall',
            'systemMedium',
          ],
          contentMarginsDisabled: false,
        },
        {
          name: 'AutoCorePay',
          displayName: 'Pay',
          description: 'Payouts waiting and jobs you can claim.',
          supportedFamilies: ['systemSmall'],
          contentMarginsDisabled: false,
        },
      ],
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
  withOpenIapPurchasePatch,
  require('./plugins/with-ios-push-entitlements'),
  require('./plugins/with-ios-universal-links'),
  require('./plugins/with-ios-widget-extension-sources'),
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
    ...(universalLinksEnabled ? { associatedDomains } : {}),
    ...(appleSignInEnabled ? { usesAppleSignIn: true } : {}),
    bundleIdentifier: 'com.wise.autocore.mobile',
    icon: './assets/branding/login-logo.png',
    infoPlist: {
      // Standard HTTPS/TLS only — no proprietary or non-exempt cryptography.
      // Declaring it here means App Store Connect stops asking on every build.
      ITSAppUsesNonExemptEncryption: false,
      // Browsing-web activities with a canonical webpageURL — Mac Tauri only
      // continues this type; a custom activity type would be dropped on Mac.
      NSUserActivityTypes: ['NSUserActivityTypeBrowsingWeb'],
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
      UIBackgroundModes: ['remote-notification', 'processing', 'fetch'],
      BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing'],
      NSUserNotificationsUsageDescription:
        'AutoCore sends notifications about work orders, warehouse activity, payments, and other events at your company.',
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
