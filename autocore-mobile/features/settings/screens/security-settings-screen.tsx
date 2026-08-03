import { CollectionRow, ListSection } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useSession } from '@/hooks';
import { haptics } from '@/theme';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

function resolveProvider(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email and password';
  return 'AutoCore account';
}

export function SecuritySettingsScreen() {
  const router = useGuardedRouter();
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');
  const email = profile?.email ?? firebaseUser?.email ?? '—';

  return (
    <ProfileScreenShell title="Security" subtitle="Sign-in and account protection">
      <ListSection title="Sign-in">
        <CollectionRow title="Provider" value={resolveProvider(providerIds)} showChevron={false} />
        <CollectionRow title="Email" value={email} showChevron={false} />
      </ListSection>

      <ListSection
        title="Password"
        footer={
          emailProvider
            ? 'Change your password from Edit Profile.'
            : `Signed in with ${resolveProvider(providerIds)}. No app password is used.`
        }
      >
        {emailProvider ? (
          <CollectionRow
            title="Manage password"
            subtitle="Open Edit Profile to change or reset"
            onPress={() => {
              haptics.selection();
              router.push('/(tabs)/profile/edit-profile');
            }}
          />
        ) : (
          <CollectionRow
            title="Social sign-in"
            value={resolveProvider(providerIds)}
            showChevron={false}
          />
        )}
      </ListSection>
    </ProfileScreenShell>
  );
}
