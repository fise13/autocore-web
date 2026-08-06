const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Keep in sync with the `@autocore/*` entries in package.json and tsconfig.json.
const sharedPackages = [
  'rbac',
  'domain-search',
  'org',
  'avatars',
  'design-tokens',
  'billing',
  'engine-intake',
];

config.watchFolders = sharedPackages.map((name) =>
  path.resolve(__dirname, `../packages/${name}`),
);
config.resolver.extraNodeModules = Object.fromEntries(
  sharedPackages.map((name) => [
    `@autocore/${name}`,
    path.resolve(__dirname, `../packages/${name}`),
  ]),
);

module.exports = withNativeWind(config, { input: './global.css' });
