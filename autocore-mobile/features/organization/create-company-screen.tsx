import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { StoreIcon } from '@/assets/icons';
import { useAuth } from '@/authentication/auth-provider';
import { Button, SettingsInset, SettingsSectionCard, Input, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { NotificationService } from '@/services/notifications';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

/**
 * Create a workspace as someone who already has one.
 *
 * This used to reuse `CompanyJourneyScreen`, the *onboarding* step, which meant
 * an established user tapping "Create a company" in Settings was dropped into
 * the sign-up funnel: a progress label counting steps toward an account they
 * finished creating months ago, a list of the workspaces they had just come
 * from in the switcher, and — on a screen reached from Settings — a Sign out
 * button. There was also no way back, because the funnel's shell only shows a
 * back arrow on its inner steps.
 *
 * Onboarding still owns that screen. This one is the product surface, and it
 * deliberately mirrors `JoinCompanyScreen` down to the shell and rhythm: the
 * two are the same decision seen from two sides, and they sit next to each
 * other in the same list.
 */
export function CreateCompanyScreen() {
  const router = useRouter();
  const { createCompany, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      await createCompany(trimmed);
      await refreshProfile();
      await NotificationService.syncInbox();
      router.back();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileScreenShell
      title="New company"
      subtitle="A separate workspace with its own inventory, orders and team. Your current company stays in the list."
    >
      <SettingsSectionCard title="Company" description="Name it" icon={StoreIcon}>
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            gap: rhythm.inline,
          }}
        >
          <SettingsInset embedded>
            <Input
              placeholder="e.g. North Yard Motors"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
          </SettingsInset>

          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Shown on the home screen, documents and invites. You can change it later in settings.
          </Text>

          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}

          <Button onPress={() => void handleCreate()} loading={loading} disabled={!name.trim()}>
            Create company
          </Button>
        </View>
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
