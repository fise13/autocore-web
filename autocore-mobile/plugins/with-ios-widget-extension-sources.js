const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET_NAME = 'ExpoWidgetsTarget';

/**
 * expo-widgets only adds Swift files to the Xcode target the first time the
 * extension is created. Later widgets in app.config never reach the WidgetBundle
 * compile, so they never show in the iOS gallery.
 *
 * This plugin keeps every `ExpoWidgetsTarget/*.swift` file in the target's
 * Sources phase, and names the extension AutoCore so the gallery lists them
 * under the app — not "ExpoWidgetsTarget".
 */
function withIosWidgetExtensionSources(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetDir = path.join(config.modRequest.platformProjectRoot, TARGET_NAME);
    if (!fs.existsSync(targetDir)) return config;

    const targetUuid = project.findTargetKey(TARGET_NAME);
    const groupKey = findGroupKey(project, TARGET_NAME);
    if (!targetUuid || !groupKey) return config;

    const existing = new Set(listGroupFileNames(project, groupKey));
    for (const fileName of fs.readdirSync(targetDir).filter((name) => name.endsWith('.swift'))) {
      if (existing.has(fileName)) continue;
      project.addSourceFile(fileName, { target: targetUuid }, groupKey);
    }

    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      if (key.endsWith('_comment')) continue;
      const buildSettings = configs[key].buildSettings;
      if (!buildSettings) continue;
      const bundleId = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER ?? '').replace(/"/g, '');
      if (bundleId !== 'com.wise.autocore.mobile.ExpoWidgetsTarget') continue;
      buildSettings.INFOPLIST_KEY_CFBundleDisplayName = 'AutoCore';
    }

    return config;
  });
}

function findGroupKey(project, name) {
  const groups = project.hash.project.objects.PBXGroup ?? {};
  for (const key of Object.keys(groups)) {
    if (key.endsWith('_comment')) continue;
    const group = groups[key];
    const groupName = String(group.name ?? group.path ?? '').replace(/"/g, '');
    if (groupName === name) return key;
  }
  return null;
}

function listGroupFileNames(project, groupKey) {
  const group = project.hash.project.objects.PBXGroup[groupKey];
  const names = [];
  for (const child of group?.children ?? []) {
    const comment = child.comment ?? '';
    const value = String(child.value ?? '');
    const fileRef = project.hash.project.objects.PBXFileReference?.[value];
    const pathName = String(fileRef?.path ?? fileRef?.name ?? comment).replace(/"/g, '');
    if (pathName) names.push(pathName);
  }
  return names;
}

module.exports = withIosWidgetExtensionSources;
