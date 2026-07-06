const { withPodfile } = require('@expo/config-plugins');

const PATCH_START = '## >>> autocore-disable-swiftuicore-autolink';
const PATCH_END = '## <<< autocore-disable-swiftuicore-autolink';

/**
 * iOS 26 split SwiftUI into SwiftUI + private SwiftUICore.
 * Expo SwiftUI modules (ExpoUI, expo-symbols, …) autolink SwiftUICore into the
 * app binary, which the linker rejects. Disable that autolink on pods + app target.
 * @see https://github.com/streamyfin/streamyfin/pull/1613
 */
function buildPatch() {
  return [
    PATCH_START,
    "  if ENV['EXPO_TV'] != '1'",
    '    installer.pods_project.targets.each do |t|',
    '      t.build_configurations.each do |cfg|',
    "        cfg.build_settings['OTHER_SWIFT_FLAGS'] ||= '$(inherited)'",
    "        flags = cfg.build_settings['OTHER_SWIFT_FLAGS']",
    "        flags = flags.join(' ') if flags.is_a?(Array)",
    "        unless flags.include?('-disable-autolink-framework -Xfrontend SwiftUICore')",
    "          cfg.build_settings['OTHER_SWIFT_FLAGS'] = flags + ' -Xfrontend -disable-autolink-framework -Xfrontend SwiftUICore'",
    '        end',
    '      end',
    '    end',
    '',
    '    installer.aggregate_targets.each do |agg|',
    '      next unless agg.user_project',
    '      agg.user_project.native_targets.each do |target|',
    '        target.build_configurations.each do |cfg|',
    "          existing = cfg.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'",
    "          existing = existing.join(' ') if existing.is_a?(Array)",
    "          unless existing.include?('-disable-autolink-framework -Xfrontend SwiftUICore')",
    "            cfg.build_settings['OTHER_SWIFT_FLAGS'] = existing + ' -Xfrontend -disable-autolink-framework -Xfrontend SwiftUICore'",
    '          end',
    '        end',
    '      end',
    '      agg.user_project.save',
    '    end',
    '  end',
    PATCH_END,
  ].join('\n');
}

function withDisableSwiftUICoreAutolink(config) {
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

module.exports = withDisableSwiftUICoreAutolink;
