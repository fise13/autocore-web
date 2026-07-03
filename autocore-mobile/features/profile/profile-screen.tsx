import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/authentication/auth-provider';
import { useTheme, useProfileHubData } from '@/hooks';
import { haptics } from '@/theme';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';

import {
  ProfilePreferenceRowItem,
  ProfileQuickActionRow,
  ProfileWorkspaceRowItem,
} from './components/profile-animated-rows';
import { ProfileDangerZone } from './components/profile-danger-zone';
import { ProfileHeader } from './components/profile-header';
import { ProfileHeroCard } from './components/profile-hero-card';
import { ProfileSettingsGroup } from './components/profile-nav-card';
import { SectionTitle } from './components/profile-section-title';
import { profileTimeline } from './animation/profile-timeline';
import { profileLayout } from './layout';
import { profileHubRouteHref } from './navigation';
import type { ProfileHubRouteId, ProfilePreferenceRow } from './types';

type SettingsGroupProps = {
  title: string;
  titleDelay: number;
  rows: ProfilePreferenceRow[];
  baseDelay: number;
  onOpen: (id: ProfileHubRouteId) => void;
};

function SettingsGroup({ title, titleDelay, rows, baseDelay, onOpen }: SettingsGroupProps) {
  if (rows.length === 0) return null;

  return (
    <View>
      <SectionTitle title={title} delay={titleDelay} />
      <ProfileSettingsGroup>
        {rows.map((row, index) => (
          <ProfilePreferenceRowItem
            key={row.id}
            row={row}
            delay={baseDelay + index * profileTimeline.preferencesStagger}
            onPress={() => onOpen(row.id as ProfileHubRouteId)}
          />
        ))}
      </ProfileSettingsGroup>
    </View>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, firebaseUser, refreshProfile } = useAuth();
  const data = useProfileHubData();

  const open = (id: ProfileHubRouteId) => {
    router.push(profileHubRouteHref(id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 96,
          gap: profileLayout.section,
        }}
      >
        <ProfileHeader />
        <ProfileHeroCard user={data.user} />

        <View style={{ gap: 10 }}>
          {data.quickActions.map((action, index) => (
            <ProfileQuickActionRow
              key={action.id}
              action={action}
              delay={profileTimeline.quickBase + index * profileTimeline.quickStagger}
              onPress={() => open(action.id)}
            />
          ))}
        </View>

        <SettingsGroup
          title="Компания"
          titleDelay={220}
          baseDelay={260}
          rows={data.workspaceSettings}
          onOpen={open}
        />

        <SettingsGroup
          title="Конфигурация"
          titleDelay={380}
          baseDelay={420}
          rows={data.configuration}
          onOpen={open}
        />

        <SettingsGroup
          title="Бизнес"
          titleDelay={520}
          baseDelay={560}
          rows={data.business}
          onOpen={open}
        />

        <SettingsGroup
          title="Приложение"
          titleDelay={620}
          baseDelay={660}
          rows={data.appSettings}
          onOpen={open}
        />

        <View>
          <SectionTitle title="Рабочее пространство" delay={profileTimeline.workspaceTitle} />
          <ProfileSettingsGroup>
            {data.workspace.map((row, index) => (
              <ProfileWorkspaceRowItem
                key={`${row.companyId ?? row.title}-${index}`}
                row={row}
                delay={profileTimeline.workspaceBase + index * profileTimeline.workspaceStagger}
                onPress={async () => {
                  if (row.companyId && firebaseUser) {
                    await switchActiveCompany(firebaseUser.uid, row.companyId);
                    await refreshProfile();
                    haptics.success();
                  } else {
                    open(row.id);
                  }
                }}
              />
            ))}
          </ProfileSettingsGroup>
        </View>

        <SettingsGroup
          title="Система"
          titleDelay={700}
          baseDelay={740}
          rows={data.system}
          onOpen={open}
        />

        <ProfileDangerZone
          items={data.dangerZone}
          onAction={async (id) => {
            if (id === 'sign-out') {
              haptics.warning();
              await signOut();
            }
          }}
        />
      </ScrollView>
    </View>
  );
}
