import { useState } from 'react';
import { View } from 'react-native';
import type React from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useReleaseStackNavigationOnFocus } from '@/hooks/use-release-stack-navigation';
import { ListGroup, ListRow, Screen, ScreenScroll, SectionHeader } from '@/components/ui';
import { useDeleteAccount, useProfileHubData } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { haptics, rhythm, spacing } from '@/theme';
import { SETTINGS_HUB_SECTIONS } from '@/features/settings/data/settings-sections';
import type { SettingsHubRouteId } from '@/features/settings/types';

type ProfileHubRow = {
  id: SettingsHubRouteId | 'my-earnings';
  title: string;
  icon: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};
import { CoinsIcon } from '@/assets/icons';

import { DeleteAccountDialog } from './components/delete-account-dialog';
import { ProfileHeader } from './components/profile-header';
import { ProfileHeroCard } from './components/profile-hero-card';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';
import { profileHubRouteHref } from './navigation';

const SECTION_GAP = spacing[4];

export function ProfileScreen() {
  const router = useGuardedRouter();
  useReleaseStackNavigationOnFocus();
  const { signOut, memberships } = useAuth();
  const data = useProfileHubData();
  const rbac = useRbacPolicy();
  const deleteAccount = useDeleteAccount();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const canSwitchOrg = memberships.length > 1;

  const open = (id: SettingsHubRouteId) => {
    router.push(profileHubRouteHref(id));
  };

  const sections: Array<{ id: string; label: string; rows: ProfileHubRow[] }> = SETTINGS_HUB_SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      if (row.id === 'team') return rbac.nav.canViewEmployees;
      if (row.id === 'company') return rbac.nav.canManageSettings || rbac.isOwner;
      if (row.id === 'advanced') return rbac.nav.canManageSettings;
      if (row.id === 'finance') return rbac.scopes.accounting !== 'none';
      return true;
    }),
  })).filter((section) => section.rows.length > 0);

  const financeSectionIndex = sections.findIndex((section) => section.id === 'finance');
  if (rbac.nav.canAccessMyEarnings) {
    const earningsRow: ProfileHubRow = {
      id: 'my-earnings',
      title: 'Мои начисления',
      icon: CoinsIcon,
    };
    if (financeSectionIndex >= 0) {
      sections[financeSectionIndex] = {
        ...sections[financeSectionIndex],
        rows: [earningsRow, ...sections[financeSectionIndex].rows],
      };
    } else {
      sections.push({
        id: 'earnings',
        label: 'Начисления',
        rows: [earningsRow],
      });
    }
  }

  return (
    <Screen>
      <ScreenScroll tabBarInset contentStyle={{ gap: SECTION_GAP }}>
        <ProfileHeader />
        <ProfileHeroCard
          user={data.user}
          onPress={canSwitchOrg ? () => setSwitcherOpen(true) : undefined}
          showSwitcherHint={canSwitchOrg}
        />

        {sections.map((section) => (
          <View key={section.id} style={{ gap: rhythm.micro }}>
            <SectionHeader title={section.label} label inset />
            <ListGroup>
              {section.rows.map((row) => (
                <ListRow
                  key={row.id}
                  title={row.title}
                  icon={row.icon}
                  value={row.id === 'my-earnings' ? undefined : data.rowValues[row.id as SettingsHubRouteId]}
                  onPress={() => {
                    if (row.id === 'my-earnings') {
                      router.push('/(tabs)/my-earnings');
                      return;
                    }
                    open(row.id as SettingsHubRouteId);
                  }}
                />
              ))}
            </ListGroup>
          </View>
        ))}

        <View style={{ gap: rhythm.micro }}>
          <SectionHeader title="Опасная зона" label inset />
          <ListGroup>
            {data.dangerZone.map((item) => (
              <ListRow
                key={item.id}
                title={item.title}
                tone="danger"
                showChevron={false}
                onPress={() => {
                  if (item.id === 'sign-out') {
                    haptics.warning();
                    void signOut();
                    return;
                  }
                  if (item.id === 'delete-account') {
                    deleteAccount.requestDelete();
                  }
                }}
              />
            ))}
          </ListGroup>
        </View>

        <DeleteAccountDialog
          open={deleteAccount.passwordOpen}
          password={deleteAccount.password}
          loading={deleteAccount.loading}
          error={deleteAccount.error}
          onPasswordChange={deleteAccount.setPassword}
          onConfirm={deleteAccount.confirmPasswordDelete}
          onCancel={deleteAccount.cancelPasswordDelete}
        />
      </ScreenScroll>
      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </Screen>
  );
}
