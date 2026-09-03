const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Both public origins are claimed.
 *
 * `myautocore.com` 301-redirects app routes to `app.myautocore.com`, and iOS
 * does NOT follow redirects when deciding whether to open an app — a link
 * shared as `myautocore.com/work-orders/123` would land in Safari unless the
 * marketing origin is claimed directly. Each origin serves its own
 * `apple-app-site-association` from the same Next.js route handler.
 */
const ASSOCIATED_DOMAINS = [
  'applinks:app.myautocore.com',
  'applinks:myautocore.com',
  'activitycontinuation:app.myautocore.com',
  'activitycontinuation:myautocore.com',
];

const BROWSING_WEB_ACTIVITY = 'NSUserActivityTypeBrowsingWeb';

/**
 * Associated Domains requires the capability on the
 * `com.wise.autocore.mobile` App ID in Apple Developer. It is on by default so
 * release and TestFlight builds ship working Universal Links; set
 * `EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS=0` to drop the entitlement if a local
 * build has to be signed with a profile that lacks the capability.
 */
function isUniversalLinksEnabled() {
  const flag = process.env.EXPO_PUBLIC_ENABLE_UNIVERSAL_LINKS?.trim().toLowerCase();
  return flag !== '0' && flag !== 'false';
}

function withIosUniversalLinks(config) {
  config = withEntitlementsPlist(config, (modConfig) => {
    if (!isUniversalLinksEnabled()) {
      delete modConfig.modResults['com.apple.developer.associated-domains'];
      return modConfig;
    }

    const existing = modConfig.modResults['com.apple.developer.associated-domains'] ?? [];
    const domains = Array.isArray(existing) ? [...existing] : [];
    for (const domain of ASSOCIATED_DOMAINS) {
      if (!domains.includes(domain)) domains.push(domain);
    }
    modConfig.modResults['com.apple.developer.associated-domains'] = domains;
    return modConfig;
  });

  // Expo Router writes `$(PRODUCT_BUNDLE_IDENTIFIER).expo.index_route` and
  // used to replace our browsing-web type. Handoff webpageURL needs both.
  config = withInfoPlist(config, (modConfig) => {
    const existing = modConfig.modResults.NSUserActivityTypes;
    const types = Array.isArray(existing) ? [...existing] : [];
    if (!types.includes(BROWSING_WEB_ACTIVITY)) {
      types.unshift(BROWSING_WEB_ACTIVITY);
    }
    modConfig.modResults.NSUserActivityTypes = types;
    return modConfig;
  });

  return config;
}

module.exports = withIosUniversalLinks;
module.exports.ASSOCIATED_DOMAINS = ASSOCIATED_DOMAINS;
module.exports.isUniversalLinksEnabled = isUniversalLinksEnabled;
