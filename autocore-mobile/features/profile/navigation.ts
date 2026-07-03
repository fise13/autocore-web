import type { Href } from 'expo-router';

import { settingsRouteHref } from '@/features/settings/navigation';
import type { SettingsRouteId } from '@/features/settings/types';

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
  'workspace-company': '/(tabs)/profile/company',
  'workspace-plan': '/(tabs)/profile/subscription',
  'workspace-employees': '/(tabs)/profile/team',
  'workspace-permissions': '/(tabs)/profile/team',
};

export function profileRouteHref(id: ProfileRouteId): Href {
  return PROFILE_ROUTES[id];
}

export function profileHubRouteHref(id: ProfileHubRouteId): Href {
  if (id in PROFILE_ROUTES) {
    return PROFILE_ROUTES[id as ProfileRouteId];
  }
  return settingsRouteHref(id as SettingsRouteId);
}
