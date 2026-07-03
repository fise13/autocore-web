import { useMemo } from 'react';

import {
  BarChart3Icon,
  BellIcon,
  CoinsIcon,
  LayoutGridIcon,
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

import type {
  ProfileHubData,
  ProfileHubRouteId,
  ProfilePreferenceRow,
  ProfileQuickAction,
} from '@/features/profile/types';

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

function row(
  id: ProfileHubRouteId,
  title: string,
  value: string,
  icon: ProfilePreferenceRow['icon'],
): ProfilePreferenceRow {
  return { id, title, value, icon };
}

export function useProfileHubData(): ProfileHubData {
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

    const quickActions: ProfileQuickAction[] = [
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
        subtitle: isPro ? 'Сотрудники и роли' : 'Доступно на Pro',
        icon: UsersIcon,
      },
    ];

    const workspaceSettings = [
      row('workspace', 'Рабочее пространство', companyName, LayoutGridIcon),
      row('company', 'Компания', planLabel, StoreIcon),
      row('subscription', 'Подписка', subscriptionHint(subscription, isPro), ReceiptIcon),
      row('team', 'Команда и роли', isPro ? 'Управление' : 'Pro', UsersIcon),
    ];

    const configuration = [
      row('account', 'Аккаунт', profile?.displayName?.trim() || 'Профиль', UserRoundIcon),
      row('navigation', 'Навигация', 'Нижняя панель', SettingsIcon),
      row('modules', 'Модули', 'Разделы продукта', SparklesIcon),
    ];

    const business = [row('accounting', 'Бухгалтерия', 'KZT · НДС 12%', ReceiptIcon)];

    const appSettings = [
      row('appearance', 'Оформление', themePreferenceLabel(preference), SparklesIcon),
      row('language', 'Язык', 'Русский', SettingsIcon),
      row('currency', 'Валюта', 'KZT', CoinsIcon),
      row(
        'notifications',
        'Уведомления',
        notificationPreferences.pushEnabled ? 'Включены' : 'Выключены',
        BellIcon,
      ),
    ];

    const system = [row('advanced', 'Расширенные', 'Данные и кэш', BarChart3Icon)];

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
      quickActions,
      preferences: appSettings,
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
      workspaceSettings,
      configuration,
      business,
      appSettings,
      system,
    };
  }, [
    companyName,
    firebaseUser?.email,
    firebaseUser?.providerData,
    firebaseUser?.uid,
    isPro,
    memberships,
    notificationPreferences.pushEnabled,
    photoURL,
    preference,
    profile,
    subscription,
  ]);
}
