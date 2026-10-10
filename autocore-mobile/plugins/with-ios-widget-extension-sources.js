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
 *
 * It also drops references that would break the build: widgets removed from
 * app.config (expo-widgets deletes their .swift, the reference stays), and
 * files a past run put in CocoaPods' path-less `ExpoModulesProviders/
 * ExpoWidgetsTarget` group, where they resolve to `ios/<name>.swift`.
 */
function withIosWidgetExtensionSources(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetDir = path.join(config.modRequest.platformProjectRoot, TARGET_NAME);
    if (!fs.existsSync(targetDir)) return config;

    const targetUuid = project.findTargetKey(TARGET_NAME);
    const groupKey = findGroupKey(project, TARGET_NAME);
    if (!targetUuid || !groupKey) return config;

    const onDisk = new Set(fs.readdirSync(targetDir).filter((name) => name.endsWith('.swift')));
    const groups = project.hash.project.objects.PBXGroup;
    for (const key of Object.keys(groups)) {
      if (key.endsWith('_comment') || groupName(groups[key]) !== TARGET_NAME) continue;
      for (const child of [...(groups[key].children ?? [])]) {
        const name = fileRefName(project, child);
        if (!name.endsWith('.swift')) continue;
        const stale = key === groupKey ? !onDisk.has(name) : onDisk.has(name);
        if (stale) removeFileRef(project, key, child.value);
      }
    }

    const existing = new Set(listGroupFileNames(project, groupKey));
    for (const fileName of onDisk) {
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

// The extension's own group is the one with `path = ExpoWidgetsTarget`.
// CocoaPods adds a second, path-less group with the same name.
function findGroupKey(project, name) {
  const groups = project.hash.project.objects.PBXGroup ?? {};
  for (const key of Object.keys(groups)) {
    if (key.endsWith('_comment')) continue;
    if (String(groups[key].path ?? '').replace(/"/g, '') === name) return key;
  }
  return null;
}

function groupName(group) {
  return String(group.name ?? group.path ?? '').replace(/"/g, '');
}

function fileRefName(project, child) {
  const fileRef = project.hash.project.objects.PBXFileReference?.[String(child.value ?? '')];
  return String(fileRef?.path ?? fileRef?.name ?? child.comment ?? '').replace(/"/g, '');
}

function listGroupFileNames(project, groupKey) {
  const group = project.hash.project.objects.PBXGroup[groupKey];
  return (group?.children ?? []).map((child) => fileRefName(project, child)).filter(Boolean);
}

// By uuid: the xcode lib's removeSourceFile matches by name and would hit the
// wrong reference when two share one.
function removeFileRef(project, groupKey, refUuid) {
  const objects = project.hash.project.objects;
  const group = objects.PBXGroup[groupKey];
  group.children = group.children.filter((child) => child.value !== refUuid);
  delete objects.PBXFileReference[refUuid];
  delete objects.PBXFileReference[`${refUuid}_comment`];

  const buildFiles = objects.PBXBuildFile ?? {};
  const dropped = new Set();
  for (const key of Object.keys(buildFiles)) {
    if (key.endsWith('_comment') || buildFiles[key].fileRef !== refUuid) continue;
    dropped.add(key);
    delete buildFiles[key];
    delete buildFiles[`${key}_comment`];
  }
  for (const phase of Object.values(objects.PBXSourcesBuildPhase ?? {})) {
    if (Array.isArray(phase.files)) phase.files = phase.files.filter((file) => !dropped.has(file.value));
  }
}

module.exports = withIosWidgetExtensionSources;
