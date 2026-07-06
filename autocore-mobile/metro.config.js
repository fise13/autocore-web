const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '../packages/rbac'),
  path.resolve(__dirname, '../packages/domain-search'),
  path.resolve(__dirname, '../packages/org'),
];
config.resolver.extraNodeModules = {
  '@autocore/rbac': path.resolve(__dirname, '../packages/rbac/src'),
  '@autocore/domain-search': path.resolve(__dirname, '../packages/domain-search/src'),
  '@autocore/org': path.resolve(__dirname, '../packages/org/src'),
};

module.exports = withNativeWind(config, { input: './global.css' });
