const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/** Ensures iOS push entitlements survive prebuild (expo-notifications alone missed them here). */
function withIosPushEntitlements(config) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['aps-environment'] = 'production';
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
