import Constants from 'expo-constants';

const MOBILE_BUNDLE_ID = 'com.wise.autocore.mobile';

/** Actionable checklist when native Apple Sign In fails before Firebase (entitlements / Apple Developer). */
export function getAppleNativeSetupHint(): string {
  return [
    `1. Apple Developer → Identifiers → App ID ${MOBILE_BUNDLE_ID} → включите Sign in with Apple.`,
    '2. Пересоберите iOS-проект: npx expo prebuild --platform ios && npx expo run:ios.',
    '3. Firebase → Authentication → Apple: Team ID, Key ID, Services ID com.wise.autocore.web и .p8 ключ (как на web).',
    `4. Убедитесь, что в ios/AutoCore/AutoCore.entitlements есть com.apple.developer.applesignin.`,
  ].join('\n');
}

export function getAppleNativeBundleId(): string {
  return Constants.expoConfig?.ios?.bundleIdentifier ?? MOBILE_BUNDLE_ID;
}

export function formatAppleNativeErrorForUi(error: unknown): string | null {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  const message = error instanceof Error ? error.message : String(error ?? '');

  if (
    code === 'ERR_REQUEST_UNKNOWN' ||
    code === 'ERR_INVALID_OPERATION' ||
    /authorization attempt failed/i.test(message) ||
    /AuthenticationServices\.AuthorizationError.*1000/i.test(message) ||
    /AKAuthenticationError.*-7026/i.test(message)
  ) {
    return (
      'Apple Sign In не настроен в этой сборке. ' +
      `Включите capability для ${getAppleNativeBundleId()} в Apple Developer и пересоберите приложение (npx expo run:ios).`
    );
  }

  return null;
}
