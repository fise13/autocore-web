const { withEntitlementsPlist } = require('@expo/config-plugins');

const ASSOCIATED_DOMAIN = 'applinks:app.myautocore.com';

/** Ensures Associated Domains entitlement survives prebuild (required for invite email → app). */
function withIosUniversalLinks(config) {
  return withEntitlementsPlist(config, (config) => {
    const existing = config.modResults['com.apple.developer.associated-domains'] ?? [];
    const domains = Array.isArray(existing) ? [...existing] : [];
    if (!domains.includes(ASSOCIATED_DOMAIN)) {
      domains.push(ASSOCIATED_DOMAIN);
    }
    config.modResults['com.apple.developer.associated-domains'] = domains;
    return config;
  });
}

module.exports = withIosUniversalLinks;
