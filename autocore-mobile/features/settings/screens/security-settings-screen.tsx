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
  if (providerIds.includes('password')) return 'Email и пароль';
  return 'Аккаунт AutoCore';
}

export function SecuritySettingsScreen() {
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');

  return (
    <ProfileScreenShell title="Безопасность" subtitle="Вход и защита аккаунта">
      <ProfileMetaCard title="Способ входа">
        <ProfileMetaRow label="Провайдер" value={resolveProvider(providerIds)} />
        <ProfileMetaRow label="Email" value={profile?.email ?? firebaseUser?.email ?? '—'} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Пароль">
        <View style={{ gap: rhythm.tight }}>
          <Text variant="body" style={{ fontSize: 14, lineHeight: 20 }}>
            {emailProvider
              ? 'Изменить пароль можно в редактировании профиля.'
              : `Вход через ${resolveProvider(providerIds)}. Пароль приложения не используется.`}
          </Text>
        </View>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
