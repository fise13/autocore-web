import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type React from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useReleaseStackNavigationOnFocus } from '@/hooks/use-release-stack-navigation';
import { ListGroup, ListRow, ProductScreenShell, ScreenScroll, SectionHeader } from '@/components/ui';
import { useDeleteAccount, useProfileHubData } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { haptics, layout, rhythm } from '@/theme';
import { SETTINGS_HUB_SECTIONS } from '@/features/settings/data/settings-sections';
import type { SettingsHubRouteId } from '@/features/settings/types';
import { CoinsIcon, StoreIcon } from '@/assets/icons';

import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';

import { DeleteAccountDialog } from './components/delete-account-dialog';
import { ProfileHeader } from './components/profile-header';
import { ProfileHeroCard } from './components/profile-hero-card';
import { profileHubRouteHref } from './navigation';

type ProfileHubRow = {
  id: SettingsHubRouteId | 'my-earnings';
  title: string;
  icon: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

const SECTION_GAP = layout.sectionGap;

export function ProfileScreen() {
  const router = useGuardedRouter();
  useReleaseStackNavigationOnFocus();
  const { signOut, memberships } = useAuth();
  const data = useProfileHubData();
  const rbac = useRbacPolicy();
  const deleteAccount = useDeleteAccount();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const canSwitchOrg = memberships.length > 1;

  const sections = useMemo(() => {
    const next: Array<{ id: string; label: string; rows: ProfileHubRow[] }> = SETTINGS_HUB_SECTIONS.map(
      (section) => ({
        ...section,
        rows: section.rows.filter((row) => {
          if (row.id === 'team') return rbac.nav.canViewEmployees;
          if (row.id === 'company') return rbac.nav.canManageSettings || rbac.isOwner;
          if (row.id === 'advanced') return rbac.nav.canManageSettings;
          if (row.id === 'finance') return rbac.scopes.accounting !== 'none';
          return true;
        }),
      }),
    ).filter((section) => section.rows.length > 0);

    if (rbac.nav.canAccessMyEarnings) {
      const earningsRow: ProfileHubRow = {
        id: 'my-earnings',
        title: 'My Earnings',
        icon: CoinsIcon,
      };
      const financeSectionIndex = next.findIndex((section) => section.id === 'finance');
      if (financeSectionIndex >= 0) {
        next[financeSectionIndex] = {
          ...next[financeSectionIndex],
          rows: [earningsRow, ...next[financeSectionIndex].rows],
        };
      } else {
        next.push({
          id: 'earnings',
          label: 'Earnings',
          rows: [earningsRow],
        });
      }
    }

    return next;
  }, [
    rbac.isOwner,
    rbac.nav.canAccessMyEarnings,
    rbac.nav.canManageSettings,
    rbac.nav.canViewEmployees,
    rbac.scopes.accounting,
  ]);

  const openRow = (row: ProfileHubRow) => {
    if (row.id === 'my-earnings') {
      router.push('/(tabs)/profile/my-earnings');
      return;
    }
    router.push(profileHubRouteHref(row.id as SettingsHubRouteId));
  };

  return (
    <ProductScreenShell brandWash animateEnter={false}>
      <ScreenScroll tabBarInset contentStyle={{ gap: SECTION_GAP }}>
        <ProfileHeader />
        <ProfileHeroCard user={data.user} />

        {sections.map((section) => (
          <View key={section.id} style={{ gap: rhythm.micro }}>
            <SectionHeader title={section.label} label inset />
            <View>
              <ListGroup>
                {/* Same card, same row grammar as its neighbours — it is a
                    navigation row, not a separate kind of thing. */}
                {section.id === 'company' && canSwitchOrg ? (
                  <ListRow
                    title="Switch organization"
                    subtitle={data.user.company || 'Organization'}
                    icon={StoreIcon}
                    onPress={() => {
                      haptics.selection();
                      setSwitcherOpen(true);
                    }}
                  />
                ) : null}
                {section.rows.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.title}
                    icon={row.icon}
                    value={row.id === 'my-earnings' ? undefined : data.rowValues[row.id as SettingsHubRouteId]}
                    onPress={() => openRow(row)}
                  />
                ))}
              </ListGroup>
            </View>
          </View>
        ))}

        {canSwitchOrg && !sections.some((section) => section.id === 'company') ? (
          <View style={{ gap: rhythm.micro }}>
            <SectionHeader title="Company" label inset />
            <ListGroup>
              <ListRow
                title="Switch organization"
                subtitle={data.user.company || 'Organization'}
                icon={StoreIcon}
                onPress={() => {
                  haptics.selection();
                  setSwitcherOpen(true);
                }}
              />
            </ListGroup>
          </View>
        ) : null}

        <View style={{ gap: rhythm.micro }}>
          <SectionHeader title="Danger Zone" label inset />
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

        {deleteAccount.passwordOpen ? (
          <DeleteAccountDialog
            open={deleteAccount.passwordOpen}
            password={deleteAccount.password}
            loading={deleteAccount.loading}
            error={deleteAccount.error}
            onPasswordChange={deleteAccount.setPassword}
            onConfirm={deleteAccount.confirmPasswordDelete}
            onCancel={deleteAccount.cancelPasswordDelete}
          />
        ) : null}
      </ScreenScroll>
      {switcherOpen ? (
        <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      ) : null}
    </ProductScreenShell>
  );
}
