import { View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import {
  Button,
  SettingsInset,
  SettingsLinkRow,
  SettingsSectionCard,
  Text,
} from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useDeleteAccount, useSession } from '@/hooks';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';
import { rhythm } from '@/theme';

import { settingsRouteHref } from '../navigation';
import { DeleteAccountDialog } from '@/features/profile/components/delete-account-dialog';
import { ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
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
      <SettingsInset>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.stack }}>
          <UserAvatar
            displayName={profile?.displayName ?? 'User'}
            photoURL={photoURL}
            seed={profile?.id}
            size="lg"
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
      </SettingsInset>

      <SettingsSectionCard title="General" description="Profile details">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <ProfileMetaRow label="Name" value={profile?.displayName?.trim() || '—'} />
          <ProfileMetaRow label="Email" value={profile?.email ?? firebaseUser?.email ?? '—'} />
          <ProfileMetaRow label="Sign-in method" value={resolveProvider(providerIds)} />
          <ProfileMetaRow label="Role" value={ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Employee'} />
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Settings" description="Profile and interface">
        <SettingsLinkRow
          title="Edit profile"
          value="Name, phone, photo"
          onPress={() => router.push(settingsRouteHref('edit-profile'))}
        />
        <SettingsLinkRow
          title="Theme"
          value={themePreferenceLabel(preference)}
          bordered
          onPress={() => router.push(settingsRouteHref('appearance'))}
        />
      </SettingsSectionCard>

      <SettingsSectionCard title="Password">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            {emailProvider
              ? 'You can change your password from Edit Profile.'
              : `Signed in via ${resolveProvider(providerIds)}. No app password is used.`}
          </Text>
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Desktop connection">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <ProfileMetaRow label="Status" value="Not connected" />
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Syncing with AutoCore Desktop is coming in a future update. For now, all data is
            available in the cloud and on the web app.
          </Text>
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Danger zone" tone="danger" description="Deletion is permanent">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Your profile and access to AutoCore will be deleted. Company data will remain with other members.
          </Text>
          <Button
            onPress={deleteAccount.requestDelete}
            disabled={deleteAccount.loading}
            loading={deleteAccount.loading}
            style={{ backgroundColor: colors.destructive }}
          >
            Delete account
          </Button>
        </View>
      </SettingsSectionCard>

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
