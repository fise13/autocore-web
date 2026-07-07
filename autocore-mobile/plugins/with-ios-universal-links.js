const { withEntitlementsPlist } = require('@expo/config-plugins');

const ASSOCIATED_DOMAIN = 'applinks:app.myautocore.com';

function isUniversalLinksEnabled() {
  const flag = process.env.EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS?.trim().toLowerCase();
  return flag === '1' || flag === 'true';
}

/**
 * Associated Domains require the capability on com.wise.autocore.mobile in Apple Developer.
 * Enable only after App ID has Associated Domains + `npm run ios:provision`.
 * Set EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS=true in .env.local for invite deep links.
 */
function withIosUniversalLinks(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    if (isUniversalLinksEnabled()) {
      const existing = modConfig.modResults['com.apple.developer.associated-domains'] ?? [];
      const domains = Array.isArray(existing) ? [...existing] : [];
      if (!domains.includes(ASSOCIATED_DOMAIN)) {
        domains.push(ASSOCIATED_DOMAIN);
      }
      modConfig.modResults['com.apple.developer.associated-domains'] = domains;
    } else {
      delete modConfig.modResults['com.apple.developer.associated-domains'];
    }
    return modConfig;
  });
}

module.exports = withIosUniversalLinks;
