const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Resolves the APNs environment the build will actually be signed for.
 *
 * This must match the signing environment or push silently fails: a
 * development-signed app receives a *sandbox* device token, and APNs rejects it
 * with BadDeviceToken when the entitlement claims `production`. Expo also reads
 * this entitlement (`getIosPushNotificationServiceEnvironmentAsync`) to decide
 * which APNs environment to mint the Expo push token for, so a wrong value
 * breaks token minting and delivery together.
 *
 * - local `expo run:ios` / prebuild  → development signing  → `development`
 * - EAS `development` profile        → development signing  → `development`
 * - EAS `preview` (ad-hoc), `production`, TestFlight, App Store → `production`
 */
function resolveApsEnvironment() {
  const explicit = process.env.APS_ENVIRONMENT && process.env.APS_ENVIRONMENT.trim();
  if (explicit === 'development' || explicit === 'production') return explicit;

  const profile = process.env.EAS_BUILD_PROFILE && process.env.EAS_BUILD_PROFILE.trim();
  if (profile) return profile === 'development' ? 'development' : 'production';

  return 'development';
}

/** Ensures iOS push entitlements survive prebuild (expo-notifications alone missed them here). */
function withIosPushEntitlements(config) {
  const apsEnvironment = resolveApsEnvironment();

  config = withEntitlementsPlist(config, (config) => {
    config.modResults['aps-environment'] = apsEnvironment;
    return config;
  });

  config = withInfoPlist(config, (config) => {
    const modes = config.modResults.UIBackgroundModes ?? [];
    if (!modes.includes('remote-notification')) {
      config.modResults.UIBackgroundModes = [...modes, 'remote-notification'];
    }
    return config;
  });

  return config;
}

module.exports = withIosPushEntitlements;
