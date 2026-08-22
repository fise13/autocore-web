import { useMemo } from 'react';
import { View } from 'react-native';
import type React from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useReleaseStackNavigationOnFocus } from '@/hooks/use-release-stack-navigation';
import { CollectionRow, ListSection, ProductScreenShell, ScreenScroll } from '@/components/ui';
import { useDeleteAccount, useProfileHubData, useSession } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { presentOrganizationSwitcher } from '@/features/organization/present-organization-switcher';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { SETTINGS_HUB_SECTIONS } from '@/features/settings/data/settings-sections';
import type { SettingsHubRouteId } from '@/features/settings/types';
import { StoreIcon } from '@/assets/icons';

import { DeleteAccountDialog } from './components/delete-account-dialog';
import { ProfileHeader } from './components/profile-header';
import { ProfileHeroCard } from './components/profile-hero-card';
import { profileHubRouteHref } from './navigation';

type ProfileHubRow = {
  id: SettingsHubRouteId;
  title: string;
  icon: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export function ProfileScreen() {
  const router = useGuardedRouter();
  useReleaseStackNavigationOnFocus();
  const { signOut, memberships, refreshProfile, firebaseUser } = useAuth();
  const { companyId } = useSession();
  const data = useProfileHubData();
  const rbac = useRbacPolicy();
  const deleteAccount = useDeleteAccount();

  const openOrganizationSwitcher = () => {
    haptics.selection();
    presentOrganizationSwitcher({
      memberships,
      activeCompanyId: companyId,
      userId: firebaseUser?.uid,
      refreshProfile,
      router,
    });
  };

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

    return next;
  }, [
    rbac.isOwner,
    rbac.nav.canManageSettings,
    rbac.nav.canViewEmployees,
    rbac.scopes.accounting,
  ]);

  const openRow = (row: ProfileHubRow) => {
    router.push(profileHubRouteHref(row.id));
  };

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll
        tabBarInset
        contentStyle={{ paddingTop: tokens.space.micro, paddingBottom: tokens.space.stack }}
      >
        <ProfileHeader />
        <ProfileHeroCard user={data.user} />

        <View style={{ height: tokens.space.stack }} />

        {sections.map((section) => (
          <ListSection key={section.id} title={section.label}>
            {section.id === 'company' ? (
              <CollectionRow
                title="Switch organization"
                subtitle={data.user.company || 'Organization'}
                icon={StoreIcon}
                onPress={openOrganizationSwitcher}
              />
            ) : null}
            {section.rows.map((row) => (
              <CollectionRow
                key={row.id}
                title={row.title}
                icon={row.icon}
                value={data.rowValues[row.id]}
                onPress={() => openRow(row)}
              />
            ))}
          </ListSection>
        ))}

        {!sections.some((section) => section.id === 'company') ? (
          <ListSection title="Company">
            <CollectionRow
              title="Switch organization"
              subtitle={data.user.company || 'Organization'}
              icon={StoreIcon}
              onPress={openOrganizationSwitcher}
            />
          </ListSection>
        ) : null}

        <ListSection title="Session">
          {data.dangerZone.map((item) => (
            <CollectionRow
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
        </ListSection>

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
    </ProductScreenShell>
  );
}
