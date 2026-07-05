const { withEntitlementsPlist } = require('@expo/config-plugins');

function isAppleSignInEnabled() {
  const flag = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN?.trim().toLowerCase();
  return flag !== '0' && flag !== 'false';
}

/**
 * Entitlements + ios.usesAppleSignIn (expo-apple-authentication plugin).
 * Xcode SystemCapabilities + Release signing are applied via committed ios/ project
 * (see plugins/ios-apple-sign-in-release.patch.md).
 */
function withOptionalAppleSignIn(config) {
  if (isAppleSignInEnabled()) {
    return withEntitlementsPlist(config, (modConfig) => {
      modConfig.modResults['com.apple.developer.applesignin'] = ['Default'];
      return modConfig;
    });
  }

  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults['com.apple.developer.applesignin'];
    return modConfig;
  });
}

module.exports = withOptionalAppleSignIn;
