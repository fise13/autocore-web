import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useSession } from '@/hooks';
import { rhythm } from '@/theme';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

function resolveProvider(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email and password';
  return 'AutoCore account';
}

export function SecuritySettingsScreen() {
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');

  return (
    <ProfileScreenShell title="Security" subtitle="Sign-in and account protection">
      <ProfileMetaCard title="Sign-in method">
        <ProfileMetaRow label="Provider" value={resolveProvider(providerIds)} />
        <ProfileMetaRow label="Email" value={profile?.email ?? firebaseUser?.email ?? '—'} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Password">
        <View style={{ gap: rhythm.tight }}>
          <Text variant="body" style={{ fontSize: 14, lineHeight: 20 }}>
            {emailProvider
              ? 'You can change your password from profile editing.'
              : `Signed in with ${resolveProvider(providerIds)}. No app password is used.`}
          </Text>
        </View>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
