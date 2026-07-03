const { withInfoPlist } = require('@expo/config-plugins');

function googleIosUrlScheme(iosClientId) {
  const trimmed = String(iosClientId ?? '').trim();
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const clientKey = trimmed.slice(0, -suffix.length);
  if (!clientKey) return null;
  return `com.googleusercontent.apps.${clientKey}`;
}

/**
 * Registers the reversed Google iOS client ID in CFBundleURLSchemes (required for native Google Sign-In).
 */
function withGoogleIosUrlScheme(config) {
  return withInfoPlist(config, (modConfig) => {
    const scheme = googleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
    if (!scheme) return modConfig;

    const urlTypes = Array.isArray(modConfig.modResults.CFBundleURLTypes)
      ? [...modConfig.modResults.CFBundleURLTypes]
      : [];

    const schemeBucket =
      urlTypes.find((entry) => Array.isArray(entry?.CFBundleURLSchemes)) ??
      (() => {
        const created = { CFBundleURLSchemes: [] };
        urlTypes.push(created);
        return created;
      })();

    const schemes = Array.isArray(schemeBucket.CFBundleURLSchemes)
      ? [...schemeBucket.CFBundleURLSchemes]
      : [];

    if (!schemes.includes(scheme)) {
      schemes.unshift(scheme);
    }

    schemeBucket.CFBundleURLSchemes = schemes;
    modConfig.modResults.CFBundleURLTypes = urlTypes;
    return modConfig;
  });
}

module.exports = withGoogleIosUrlScheme;
