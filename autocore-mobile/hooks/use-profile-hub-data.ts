import { useMemo } from 'react';
import Constants from 'expo-constants';

import { useAuthStore } from '@/store/auth-store';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import { getJson } from '@/lib/storage/kv';
import { sanitizeUserPhotoUrl } from '@/lib/user-photo';
import type { ProfileHubData } from '@/features/profile/types';
import type { SettingsHubRouteId } from '@/features/settings/types';
import type { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

const NOTIFICATION_CACHE_KEY = 'autocore-mobile:notification-preferences:v2';

/**
 * Instant settings-hub data: auth store + MMKV only.
 * No Firestore photo/subscription/preferences listeners on first paint.
 */
export function useProfileHubData(): ProfileHubData {
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const activeCompanyName = useAuthStore((s) => s.activeCompanyName);
  const { preference } = useTheme();

  return useMemo(() => {
    const cachedPrefs =
      getJson<NotificationPreferences>(NOTIFICATION_CACHE_KEY) ?? DEFAULT_NOTIFICATION_PREFERENCES;
    const photoURL =
      sanitizeUserPhotoUrl(profile?.photoURL) || sanitizeUserPhotoUrl(firebaseUser?.photoURL);

    const rowValues: Partial<Record<SettingsHubRouteId, string>> = {
      appearance: themePreferenceLabel(preference),
      notifications: cachedPrefs.channels.push ? 'Вкл' : 'Выкл',
      version: `${Constants.expoConfig?.version ?? '1.0.0'} · BETA`,
    };

    return {
      user: {
        id: profile?.id ?? firebaseUser?.uid ?? '',
        name: profile?.displayName?.trim() || 'Пользователь',
        email: profile?.email ?? firebaseUser?.email ?? '',
        role: ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Сотрудник',
        company: activeCompanyName ?? profile?.companyId ?? '',
        loginProvider: 'Аккаунт',
        photoURL,
        isPro: false,
        planLabel: '',
      },
      quickActions: [],
      preferences: [],
      workspace: [],
      rowValues,
      dangerZone: [
        { id: 'sign-out', title: 'Выйти из аккаунта' },
        { id: 'delete-account', title: 'Удалить аккаунт' },
      ],
    };
  }, [
    activeCompanyName,
    firebaseUser?.email,
    firebaseUser?.photoURL,
    firebaseUser?.uid,
    preference,
    profile?.companyId,
    profile?.displayName,
    profile?.email,
    profile?.id,
    profile?.photoURL,
    profile?.role,
  ]);
}
