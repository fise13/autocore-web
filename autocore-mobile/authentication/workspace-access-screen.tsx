import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Text } from '@/components/ui';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';
import { useTheme } from '@/hooks';
import { getWorkspaceAccessCopy } from '@/lib/workspace-access';
import { useAuthStore } from '@/store/auth-store';
import { rhythm } from '@/theme';

export function WorkspaceAccessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut, refreshProfile, memberships } = useAuth();
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const copy = useMemo(
    () => (workspaceBlock ? getWorkspaceAccessCopy(workspaceBlock) : null),
    [workspaceBlock],
  );

  const hasOtherCompanies = memberships.length > 0;
  const canSwitchCompany =
    workspaceBlock?.kind !== 'no_company' && hasOtherCompanies;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  if (!copy) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: rhythm.pad,
          justifyContent: 'center',
          alignItems: 'center',
          gap: rhythm.section,
        }}
      >
        <Image
          source={require('../assets/branding/login-logo.png')}
          style={{ width: rhythm.logo, height: rhythm.logo }}
          contentFit="contain"
          accessibilityLabel="AutoCore"
        />

        <View style={{ gap: rhythm.stack, alignItems: 'center', maxWidth: 340 }}>
          <Text
            variant="pageTitle"
            style={{
              textAlign: 'center',
              color: colors.foreground,
              fontSize: 22,
              lineHeight: 30,
            }}
          >
            {copy.title}
          </Text>
          <Text
            variant="pageSubtitle"
            style={{
              textAlign: 'center',
              color: colors.mutedForeground,
              lineHeight: 22,
            }}
          >
            {copy.description}
          </Text>
          {copy.hint ? (
            <Text
              variant="caption"
              style={{
                textAlign: 'center',
                color: colors.mutedForeground,
                lineHeight: 18,
              }}
            >
              {copy.hint}
            </Text>
          ) : null}
        </View>

        <View style={{ width: '100%', maxWidth: 340, gap: rhythm.inline }}>
          {canSwitchCompany ? (
            <Button onPress={() => setSwitcherOpen(true)}>Switch company</Button>
          ) : null}
          <Button
            variant={canSwitchCompany ? 'secondary' : 'default'}
            onPress={() => router.push('/(tabs)/profile/join-company' as never)}
          >
            Join a company
          </Button>
          <Button variant="secondary" loading={refreshing} onPress={() => void handleRefresh()}>
            Refresh status
          </Button>
          <Button variant="outline" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>

      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </SafeAreaView>
  );
}
