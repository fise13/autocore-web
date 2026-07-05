import { View } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useReleaseStackNavigationOnFocus } from '@/hooks/use-release-stack-navigation';
import { ListGroup, ListRow, Screen, ScreenScroll, SectionHeader } from '@/components/ui';
import { useDeleteAccount, useProfileHubData } from '@/hooks';
import { haptics, rhythm, spacing } from '@/theme';
import { SETTINGS_HUB_SECTIONS } from '@/features/settings/data/settings-sections';
import type { SettingsHubRouteId } from '@/features/settings/types';

import { DeleteAccountDialog } from './components/delete-account-dialog';
import { ProfileHeader } from './components/profile-header';
import { ProfileHeroCard } from './components/profile-hero-card';
import { profileHubRouteHref } from './navigation';

const SECTION_GAP = spacing[4];

export function ProfileScreen() {
  const router = useGuardedRouter();
  useReleaseStackNavigationOnFocus();
  const { signOut } = useAuth();
  const data = useProfileHubData();
  const deleteAccount = useDeleteAccount();

  const open = (id: SettingsHubRouteId) => {
    router.push(profileHubRouteHref(id));
  };

  return (
    <Screen>
      <ScreenScroll tabBarInset contentStyle={{ gap: SECTION_GAP }}>
        <ProfileHeader />
        <ProfileHeroCard user={data.user} />

        {SETTINGS_HUB_SECTIONS.map((section) => (
          <View key={section.id} style={{ gap: rhythm.micro }}>
            <SectionHeader title={section.label} label inset />
            <ListGroup>
              {section.rows.map((row) => (
                <ListRow
                  key={row.id}
                  title={row.title}
                  icon={row.icon}
                  value={data.rowValues[row.id]}
                  onPress={() => open(row.id)}
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
    </Screen>
  );
}
