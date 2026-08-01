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
import { subscriptionHint } from '@/lib/subscriptions/format';
import { useActiveCompanyName } from '@/hooks/use-active-company-name';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { useSession } from '@/hooks/use-session';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import type { ProfileSnapshot } from '@/features/profile/types';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  mechanic: 'Mechanic',
  diagnostician: 'Diagnostician',
  employee: 'Employee',
};

function resolveProviderLabel(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email';
  return 'Account';
}

export function useProfileSnapshot(): ProfileSnapshot {
  const { firebaseUser, memberships } = useAuth();
  const { companyName } = useActiveCompanyName();
  const { profile } = useSession();
  const { preference } = useTheme();
  const photoURL = useUserPhotoUrl();
  const { entitlement, isPro } = useEntitlement();
  const { preferences: notificationPreferences } = useNotificationPreferences();

  return useMemo(() => {
    const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
    const planLabel = isPro ? 'Pro' : 'Free';

    return {
      user: {
        id: profile?.id ?? firebaseUser?.uid ?? '',
        name: profile?.displayName?.trim() || 'User',
        email: profile?.email ?? firebaseUser?.email ?? '',
        role: ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Employee',
        company: companyName,
        loginProvider: resolveProviderLabel(providerIds),
        photoURL,
        isPro,
        planLabel,
      },
      quickActions: [
        {
          id: 'edit-profile',
          title: 'Edit profile',
          subtitle: 'Name, phone, photo',
          icon: UserRoundIcon,
        },
        {
          id: 'company',
          title: 'Company',
          subtitle: companyName,
          icon: StoreIcon,
        },
        {
          id: 'subscription',
          title: 'Subscription',
          subtitle: subscriptionHint(entitlement),
          icon: ReceiptIcon,
        },
        {
          id: 'team',
          title: 'Team',
          subtitle: isPro ? 'Employees and invitations' : 'Available on Pro',
          icon: UsersIcon,
        },
      ],
      preferences: [
        {
          id: 'appearance',
          title: 'Appearance',
          value: themePreferenceLabel(preference),
          icon: SparklesIcon,
        },
        {
          id: 'language',
          title: 'Language',
          value: 'English',
          icon: SettingsIcon,
        },
        {
          id: 'currency',
          title: 'Currency',
          value: 'KZT',
          icon: CoinsIcon,
        },
        {
          id: 'notifications',
          title: 'Notifications',
          value: notificationPreferences.channels.push ? 'On' : 'Off',
          icon: BellIcon,
        },
      ],
      workspace: memberships.map((membership) => ({
        id: 'workspace-company' as const,
        title: resolveActiveCompanyName(membership.companyId, membership.name, []),
        value:
          membership.companyId === profile?.companyId
            ? isPro
              ? 'Active · Pro'
              : 'Active'
            : membership.role,
        companyId: membership.companyId,
      })),
      dangerZone: [
        { id: 'sign-out', title: 'Sign out' },
        { id: 'delete-account', title: 'Delete account' },
      ],
    };
  }, [companyName, firebaseUser?.email, firebaseUser?.providerData, isPro, memberships, notificationPreferences.channels.push, photoURL, preference, profile, entitlement]);
}
