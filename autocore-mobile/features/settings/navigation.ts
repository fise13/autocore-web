import type { Href } from 'expo-router';

import type { SettingsRouteId } from './types';

const SETTINGS_ROUTES: Record<SettingsRouteId, Href> = {
  account: '/(tabs)/profile/account',
  workspace: '/(tabs)/profile/workspace',
  navigation: '/(tabs)/profile/navigation',
  modules: '/(tabs)/profile/modules',
  company: '/(tabs)/profile/company',
  team: '/(tabs)/profile/team',
  accounting: '/(tabs)/profile/finance',
  finance: '/(tabs)/profile/finance',
  appearance: '/(tabs)/profile/appearance',
  notifications: '/(tabs)/profile/notifications',
  advanced: '/(tabs)/profile/advanced',
  'edit-profile': '/(tabs)/profile/edit-profile',
  subscription: '/(tabs)/profile/subscription',
  language: '/(tabs)/profile/language',
  currency: '/(tabs)/profile/currency',
  security: '/(tabs)/profile/security',
  taxes: '/(tabs)/profile/taxes',
  cache: '/(tabs)/profile/cache',
  diagnostics: '/(tabs)/profile/diagnostics',
  version: '/(tabs)/profile/version',
};

export function settingsRouteHref(id: SettingsRouteId): Href {
  return SETTINGS_ROUTES[id];
}
