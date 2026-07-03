import { useMemo } from 'react';

import {
  BellIcon,
  CoinsIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
} from '@/assets/icons';
import { useAuth } from '@/authentication/auth-provider';
import { subscriptionHint } from '@/lib/billing/format-renewal';
import { useActiveCompanyName } from '@/hooks/use-active-company-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { useSession } from '@/hooks/use-session';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import type { ProfileSnapshot } from '@/features/profile/types';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

function resolveProviderLabel(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email';
  return 'Аккаунт';
}

export function useProfileSnapshot(): ProfileSnapshot {
  const { firebaseUser, memberships } = useAuth();
  const { companyName } = useActiveCompanyName();
  const { profile } = useSession();
  const { preference } = useTheme();
  const photoURL = useUserPhotoUrl();
  const { subscription, isPro } = useCompanySubscription(profile?.companyId);
  const { preferences: notificationPreferences } = useNotificationPreferences();

  return useMemo(() => {
    const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
    const planLabel = isPro ? 'Pro' : 'Бесплатный';

    return {
      user: {
        id: profile?.id ?? firebaseUser?.uid ?? '',
        name: profile?.displayName?.trim() || 'Пользователь',
        email: profile?.email ?? firebaseUser?.email ?? '',
        role: ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Сотрудник',
        company: companyName,
        loginProvider: resolveProviderLabel(providerIds),
        photoURL,
        isPro,
        planLabel,
      },
      quickActions: [
        {
          id: 'edit-profile',
          title: 'Редактировать профиль',
          subtitle: 'Имя, телефон, фото',
          icon: UserRoundIcon,
        },
        {
          id: 'company',
          title: 'Компания',
          subtitle: companyName,
          icon: StoreIcon,
        },
        {
          id: 'subscription',
          title: 'Подписка',
          subtitle: subscriptionHint(subscription, isPro),
          icon: ReceiptIcon,
        },
        {
          id: 'team',
          title: 'Команда',
          subtitle: isPro ? 'Сотрудники и приглашения' : 'Доступно на Pro',
          icon: UsersIcon,
        },
      ],
      preferences: [
        {
          id: 'appearance',
          title: 'Оформление',
          value: themePreferenceLabel(preference),
          icon: SparklesIcon,
        },
        {
          id: 'language',
          title: 'Язык',
          value: 'Русский',
          icon: SettingsIcon,
        },
        {
          id: 'currency',
          title: 'Валюта',
          value: 'KZT',
          icon: CoinsIcon,
        },
        {
          id: 'notifications',
          title: 'Уведомления',
          value: notificationPreferences.pushEnabled ? 'Включены' : 'Выключены',
          icon: BellIcon,
        },
      ],
      workspace: memberships.map((membership) => ({
        id: 'workspace-company' as const,
        title: resolveActiveCompanyName(membership.companyId, membership.name, []),
        value:
          membership.companyId === profile?.companyId
            ? isPro
              ? 'Активно · Pro'
              : 'Активно'
            : membership.role,
        companyId: membership.companyId,
      })),
      dangerZone: [{ id: 'sign-out', title: 'Выйти из аккаунта' }],
    };
  }, [companyName, firebaseUser?.email, firebaseUser?.providerData, isPro, memberships, notificationPreferences.pushEnabled, photoURL, preference, profile, subscription]);
}
