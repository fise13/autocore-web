import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { Text } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useSession } from '@/hooks';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { themePreferenceLabel, useTheme } from '@/hooks/use-theme';

import { DESKTOP_DEMO } from '../data/demo-data';
import { settingsRouteHref } from '../navigation';
import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { ProfileNavCard, ProfileSettingsGroup } from '@/features/profile/components/profile-nav-card';
import { profileLayout } from '@/features/profile/layout';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

function resolveProvider(providerIds: string[]): string {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('apple.com')) return 'Apple';
  if (providerIds.includes('password')) return 'Email и пароль';
  return 'Аккаунт AutoCore';
}

export function AccountScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const { preference, colors } = useTheme();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');

  return (
    <ProfileScreenShell title="Аккаунт" subtitle="Профиль, вход и безопасность">
      <ProfileMetaCard delay={60}>
        <View style={{ alignItems: 'center', gap: 14, paddingVertical: 6 }}>
          <UserAvatar
            displayName={profile?.displayName ?? 'Пользователь'}
            photoURL={photoURL}
            seed={profile?.id}
            size="2xl"
          />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
              {profile?.displayName?.trim() || 'Пользователь'}
            </Text>
            <Text variant="caption" color="muted">
              {profile?.email ?? firebaseUser?.email ?? '—'}
            </Text>
          </View>
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Основное" delay={100}>
        <ProfileMetaRow label="Имя" value={profile?.displayName?.trim() || '—'} />
        <ProfileMetaRow label="Email" value={profile?.email ?? firebaseUser?.email ?? '—'} />
        <ProfileMetaRow label="Способ входа" value={resolveProvider(providerIds)} />
        <ProfileMetaRow label="Роль" value={ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Сотрудник'} />
      </ProfileMetaCard>

      <View style={{ marginHorizontal: profileLayout.pad }}>
        <ProfileSettingsGroup>
          <ProfileNavCard
            title="Редактировать профиль"
            subtitle="Имя, телефон, фото и пароль"
            onPress={() => router.push(settingsRouteHref('edit-profile'))}
          />
          <ProfileNavCard
            title="Язык"
            value="Русский"
            onPress={() => router.push(settingsRouteHref('language'))}
          />
          <ProfileNavCard
            title="Тема"
            value={themePreferenceLabel(preference)}
            onPress={() => router.push(settingsRouteHref('appearance'))}
          />
        </ProfileSettingsGroup>
      </View>

      <ProfileMetaCard title="Пароль" delay={180}>
        {emailProvider ? (
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Последняя смена: 14 мая 2026. Изменить можно в редактировании профиля.
          </Text>
        ) : (
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Вход через {resolveProvider(providerIds)}. Пароль приложения не используется.
          </Text>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard title="Подключение к компьютеру" delay={220}>
        <ProfileMetaRow
          label="Статус"
          value={DESKTOP_DEMO.connected ? 'Подключено' : 'Не подключено'}
        />
        <ProfileMetaRow label="Устройство" value={DESKTOP_DEMO.deviceName} />
        <ProfileMetaRow label="Версия" value={DESKTOP_DEMO.appVersion} />
        <ProfileMetaRow label="Синхронизация" value={DESKTOP_DEMO.syncStatus} />
        <Text variant="caption" color="muted" style={{ lineHeight: 18, color: colors.mutedForeground }}>
          {DESKTOP_DEMO.lastSeen}
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
