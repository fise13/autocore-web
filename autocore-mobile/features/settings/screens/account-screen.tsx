import { View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { Button, CollectionRow, ListSection, Text } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useDeleteAccount, useSession } from '@/hooks';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme/tokens';

import { settingsRouteHref } from '../navigation';
import { DeleteAccountDialog } from '@/features/profile/components/delete-account-dialog';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  mechanic: 'Mechanic',
  diagnostician: 'Diagnostic Technician',
  employee: 'Employee',
};

function resolveProvider(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email and password';
  return 'AutoCore account';
}

export function AccountScreen() {
  const router = useGuardedRouter();
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const { preference, colors } = useTheme();
  const deleteAccount = useDeleteAccount();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');

  return (
    <ProfileScreenShell title="Account" subtitle="Profile, sign-in, and security">
      <View
        style={{
          marginHorizontal: tokens.space.screenX,
          marginBottom: tokens.space.section,
          paddingHorizontal: tokens.space.stack + 2,
          paddingVertical: tokens.space.stack,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space.stack,
        }}
      >
        <UserAvatar
          displayName={profile?.displayName ?? 'User'}
          photoURL={photoURL}
          seed={profile?.id}
          size="md"
        />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text variant="body" style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
            {profile?.displayName?.trim() || 'User'}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {profile?.email ?? firebaseUser?.email ?? '—'}
          </Text>
        </View>
      </View>

      <ListSection title="General">
        <CollectionRow title="Name" value={profile?.displayName?.trim() || '—'} showChevron={false} />
        <CollectionRow
          title="Email"
          value={profile?.email ?? firebaseUser?.email ?? '—'}
          showChevron={false}
        />
        <CollectionRow title="Sign-in" value={resolveProvider(providerIds)} showChevron={false} />
        <CollectionRow
          title="Role"
          value={ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Employee'}
          showChevron={false}
        />
      </ListSection>

      <ListSection title="Settings">
        <CollectionRow
          title="Edit profile"
          subtitle="Name, phone, photo"
          onPress={() => router.push(settingsRouteHref('edit-profile'))}
        />
        <CollectionRow
          title="Theme"
          value={themePreferenceLabel(preference)}
          onPress={() => router.push(settingsRouteHref('appearance'))}
        />
      </ListSection>

      <ListSection
        title="Password"
        footer={
          emailProvider
            ? 'Change your password from Edit Profile.'
            : `Signed in via ${resolveProvider(providerIds)}. No app password is used.`
        }
      >
        {emailProvider ? (
          <CollectionRow
            title="Manage password"
            onPress={() => router.push(settingsRouteHref('edit-profile'))}
          />
        ) : (
          <CollectionRow title="Social sign-in" value={resolveProvider(providerIds)} showChevron={false} />
        )}
      </ListSection>

      <ListSection
        title="Desktop"
        footer="Syncing with AutoCore Desktop is coming later. Data stays in the cloud and web app."
      >
        <CollectionRow title="Connection" value="Not connected" showChevron={false} />
      </ListSection>

      <ListSection
        title="Danger zone"
        footer="Your profile and access will be deleted. Company data stays with other members."
      >
        <View style={{ padding: tokens.space.stack + 2 }}>
          <Button
            onPress={deleteAccount.requestDelete}
            disabled={deleteAccount.loading}
            loading={deleteAccount.loading}
            style={{ backgroundColor: colors.destructive }}
          >
            Delete account
          </Button>
        </View>
      </ListSection>

      <DeleteAccountDialog
        open={deleteAccount.passwordOpen}
        password={deleteAccount.password}
        loading={deleteAccount.loading}
        error={deleteAccount.error}
        onPasswordChange={deleteAccount.setPassword}
        onConfirm={deleteAccount.confirmPasswordDelete}
        onCancel={deleteAccount.cancelPasswordDelete}
      />
    </ProfileScreenShell>
  );
}
