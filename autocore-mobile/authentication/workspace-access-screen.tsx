import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Text } from '@/components/ui';
import { presentOrganizationSwitcher } from '@/features/organization/present-organization-switcher';
import { useTheme } from '@/hooks';
import { getWorkspaceAccessCopy } from '@/lib/workspace-access';
import { useAuthStore } from '@/store/auth-store';
import { productCta, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

export function WorkspaceAccessScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signOut, refreshProfile, memberships, firebaseUser } = useAuth();
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);
  const [refreshing, setRefreshing] = useState(false);

  const copy = useMemo(
    () => (workspaceBlock ? getWorkspaceAccessCopy(workspaceBlock) : null),
    [workspaceBlock],
  );

  const hasOtherCompanies = memberships.length > 0;
  const canSwitchCompany =
    workspaceBlock?.kind !== 'no_company' && hasOtherCompanies;
  const isNoCompany = workspaceBlock?.kind === 'no_company';

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
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}>
        <LinearGradient
          colors={[toneBackground(colors.primary, isDark ? 0.1 : 0.12), 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>

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
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '700',
              letterSpacing: -0.7,
            }}
          >
            {copy.title}
          </Text>
          <Text
            variant="pageSubtitle"
            style={{
              textAlign: 'center',
              color: colors.mutedForeground,
              fontSize: 16,
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
          {isNoCompany ? (
            <Button
              style={{ minHeight: productCta.heightHero }}
              onPress={() => router.push('/(auth)/journey/company' as never)}
            >
              Create a company
            </Button>
          ) : null}
          {canSwitchCompany ? (
            <Button
              onPress={() => {
                const activeCompanyId =
                  workspaceBlock?.kind === 'removed' || workspaceBlock?.kind === 'deactivated'
                    ? workspaceBlock.companyId
                    : null;
                presentOrganizationSwitcher({
                  memberships,
                  activeCompanyId,
                  userId: firebaseUser?.uid,
                  refreshProfile,
                  router,
                });
              }}
            >
              Switch organization
            </Button>
          ) : null}
          <Button
            variant={isNoCompany || canSwitchCompany ? 'secondary' : 'default'}
            onPress={() => router.push('/(auth)/journey/company' as never)}
          >
            {isNoCompany ? 'Join with invite' : 'Join a company'}
          </Button>
          <Button variant="secondary" loading={refreshing} onPress={() => void handleRefresh()}>
            Refresh status
          </Button>
          <Button variant="outline" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>

    </SafeAreaView>
  );
}
