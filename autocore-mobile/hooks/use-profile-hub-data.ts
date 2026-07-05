import { useMemo } from 'react';

import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import Constants from 'expo-constants';

import type { ProfileHubData } from '@/features/profile/types';
import type { SettingsHubRouteId } from '@/features/settings/types';

import { useProfileSnapshot } from './use-profile-snapshot';

export function useProfileHubData(): ProfileHubData {
  const snapshot = useProfileSnapshot();
  const { preference } = useTheme();
  const { preferences: notificationPreferences } = useNotificationPreferences();

  return useMemo(() => {
    const rowValues: Partial<Record<SettingsHubRouteId, string>> = {
      appearance: themePreferenceLabel(preference),
      notifications: notificationPreferences.channels.push ? 'Вкл' : 'Выкл',
      version: Constants.expoConfig?.version ?? '1.0.0',
    };

    return {
      ...snapshot,
      rowValues,
    };
  }, [notificationPreferences.channels.push, preference, snapshot]);
}
