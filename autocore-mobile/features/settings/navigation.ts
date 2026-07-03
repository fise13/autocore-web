import type { Href } from 'expo-router';

import type { SettingsRouteId } from './types';

const SETTINGS_ROUTES: Record<SettingsRouteId, Href> = {
  account: '/(tabs)/profile/account',
  workspace: '/(tabs)/profile/workspace',
  navigation: '/(tabs)/profile/navigation',
  modules: '/(tabs)/profile/modules',
  company: '/(tabs)/profile/company',
  team: '/(tabs)/profile/team',
  accounting: '/(tabs)/accounting',
  appearance: '/(tabs)/profile/appearance',
  notifications: '/(tabs)/profile/notifications',
  advanced: '/(tabs)/profile/advanced',
  'edit-profile': '/(tabs)/profile/edit-profile',
  subscription: '/(tabs)/profile/subscription',
  language: '/(tabs)/profile/language',
  currency: '/(tabs)/profile/currency',
};

export function settingsRouteHref(id: SettingsRouteId): Href {
  return SETTINGS_ROUTES[id];
}
