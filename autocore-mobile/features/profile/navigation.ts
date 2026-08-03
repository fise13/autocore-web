import type { Href } from 'expo-router';

import { settingsRouteHref } from '@/features/settings/navigation';
import type { SettingsHubRouteId } from '@/features/settings/types';

import type { ProfileHubRouteId, ProfileRouteId } from './types';

const PROFILE_ROUTES: Record<ProfileRouteId, Href> = {
  'edit-profile': '/(tabs)/profile/edit-profile',
  company: '/(tabs)/profile/company',
  subscription: '/(tabs)/profile/subscription',
  team: '/(tabs)/profile/team',
  appearance: '/(tabs)/profile/appearance',
  language: '/(tabs)/profile/language',
  currency: '/(tabs)/profile/currency',
  notifications: '/(tabs)/profile/notifications',
  security: '/(tabs)/profile/security',
  taxes: '/(tabs)/profile/taxes',
  cache: '/(tabs)/profile/cache',
  diagnostics: '/(tabs)/profile/diagnostics',
  version: '/(tabs)/profile/version',
  finance: {
    pathname: '/(tabs)/profile/finance',
    params: { returnTo: 'hub' },
  } as Href,
};

export function profileRouteHref(id: ProfileRouteId): Href {
  return PROFILE_ROUTES[id];
}

export function profileHubRouteHref(id: ProfileHubRouteId): Href {
  if (id in PROFILE_ROUTES) {
    return PROFILE_ROUTES[id as ProfileRouteId];
  }
  return settingsRouteHref(id as SettingsHubRouteId);
}
