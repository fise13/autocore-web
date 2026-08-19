const { withPodfile } = require('@expo/config-plugins');

const PATCH_START = '## >>> autocore-openiap-purchase-sheet';
const PATCH_END = '## <<< autocore-openiap-purchase-sheet';

/**
 * Re-apply StoreKit sheet patches after every `pod install`.
 * OpenIAP lives in Pods and would otherwise lose the iOS 18/26 hang fixes.
 */
function buildPatch() {
  return [
    PATCH_START,
    "    system('node', File.join(__dir__, '..', 'scripts', 'patch-openiap-purchase.mjs'))",
    PATCH_END,
  ].join('\n');
}

function withOpenIapPurchasePatch(config) {
  return withPodfile(config, (podfileConfig) => {
    let podfile = podfileConfig.modResults.contents;
    const patch = buildPatch();

    if (podfile.includes(PATCH_START)) {
      podfile = podfile.replace(
        new RegExp(`${PATCH_START}[\\s\\S]*?${PATCH_END}`),
        patch,
      );
    } else if (/^\s*post_install\s+do\s+\|installer\|/m.test(podfile)) {
      podfile = podfile.replace(
        /^\s*post_install\s+do\s+\|installer\|.*$/m,
        (match) => `${match}\n\n${patch}`,
      );
    } else {
      podfile += `

post_install do |installer|
${patch}
end
`;
    }

    podfileConfig.modResults.contents = podfile;
    return podfileConfig;
  });
}

module.exports = withOpenIapPurchasePatch;
