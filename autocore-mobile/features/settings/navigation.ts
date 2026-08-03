import type { Href } from 'expo-router';

import type { SettingsRouteId } from './types';

const SETTINGS_ROUTES: Record<SettingsRouteId, Href> = {
  account: '/(tabs)/profile/account',
  workspace: '/(tabs)/profile/workspace',
  modules: '/(tabs)/profile/modules',
  company: '/(tabs)/profile/company',
  team: '/(tabs)/profile/team',
  accounting: {
    pathname: '/(tabs)/profile/finance',
    params: { returnTo: 'hub' },
  } as Href,
  finance: {
    pathname: '/(tabs)/profile/finance',
    params: { returnTo: 'hub' },
  } as Href,
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
