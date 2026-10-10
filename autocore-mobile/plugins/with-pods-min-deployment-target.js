const { withPodfile } = require('@expo/config-plugins');

const PATCH_START = '## >>> autocore-pods-min-deployment-target';
const PATCH_END = '## <<< autocore-pods-min-deployment-target';

/**
 * Xcode 27 rejects IPHONEOS_DEPLOYMENT_TARGET below 15.0 (was a warning).
 * Some pods (AsyncStorage, RNSVG, Google SDKs) ship resource-bundle targets
 * pinned to 9.0–13.0, so raise every pod target to the app's own floor.
 */
function buildPatch() {
  return [
    PATCH_START,
    "  min_ios = podfile_properties['ios.deploymentTarget'] || '16.4'",
    '  installer.pods_project.targets.each do |t|',
    '    t.build_configurations.each do |cfg|',
    "      current = cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
    '      if current.nil? || Gem::Version.new(current) < Gem::Version.new(min_ios)',
    "        cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios",
    '      end',
    '    end',
    '  end',
    PATCH_END,
  ].join('\n');
}

function withPodsMinDeploymentTarget(config) {
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

module.exports = withPodsMinDeploymentTarget;
