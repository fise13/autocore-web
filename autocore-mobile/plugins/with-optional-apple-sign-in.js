const { withEntitlementsPlist } = require('@expo/config-plugins');

function isAppleSignInEnabled() {
  return (
    process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === '1' ||
    process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === 'true'
  );
}

/** Strips Sign in with Apple entitlement when EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN is not set. */
function withOptionalAppleSignIn(config) {
  if (isAppleSignInEnabled()) return config;

  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults['com.apple.developer.applesignin'];
    return modConfig;
  });
}

module.exports = withOptionalAppleSignIn;
