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

import { DESKTOP_DEMO } from '../data/demo-data';
import { settingsRouteHref } from '../navigation';
import { DeleteAccountDialog } from '@/features/profile/components/delete-account-dialog';
import { ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

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
  const router = useGuardedRouter();
  const { firebaseUser } = useAuth();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const { preference, colors } = useTheme();
  const deleteAccount = useDeleteAccount();
  const providerIds = firebaseUser?.providerData.map((entry) => entry.providerId) ?? [];
  const emailProvider = providerIds.includes('password');

  return (
    <ProfileScreenShell title="Аккаунт" subtitle="Профиль, вход и безопасность">
      <SettingsInset>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.stack }}>
          <UserAvatar
            displayName={profile?.displayName ?? 'Пользователь'}
            photoURL={photoURL}
            seed={profile?.id}
            size="lg"
          />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text variant="body" style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
              {profile?.displayName?.trim() || 'Пользователь'}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {profile?.email ?? firebaseUser?.email ?? '—'}
            </Text>
          </View>
        </View>
      </SettingsInset>

      <SettingsSectionCard title="Основное" description="Данные профиля">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <ProfileMetaRow label="Имя" value={profile?.displayName?.trim() || '—'} />
          <ProfileMetaRow label="Email" value={profile?.email ?? firebaseUser?.email ?? '—'} />
          <ProfileMetaRow label="Способ входа" value={resolveProvider(providerIds)} />
          <ProfileMetaRow label="Роль" value={ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Сотрудник'} />
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Настройки" description="Профиль и интерфейс">
        <SettingsLinkRow
          title="Редактировать профиль"
          value="Имя, телефон, фото"
          onPress={() => router.push(settingsRouteHref('edit-profile'))}
        />
        <SettingsLinkRow
          title="Тема"
          value={themePreferenceLabel(preference)}
          bordered
          onPress={() => router.push(settingsRouteHref('appearance'))}
        />
      </SettingsSectionCard>

      <SettingsSectionCard title="Пароль">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            {emailProvider
              ? 'Изменить пароль можно в редактировании профиля.'
              : `Вход через ${resolveProvider(providerIds)}. Пароль приложения не используется.`}
          </Text>
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Подключение к компьютеру">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <ProfileMetaRow label="Статус" value={DESKTOP_DEMO.connected ? 'Подключено' : 'Не подключено'} />
          <ProfileMetaRow label="Устройство" value={DESKTOP_DEMO.deviceName} />
          <ProfileMetaRow label="Версия" value={DESKTOP_DEMO.appVersion} />
          <ProfileMetaRow label="Синхронизация" value={DESKTOP_DEMO.syncStatus} />
          <Text variant="caption" color="muted">
            {DESKTOP_DEMO.lastSeen}
          </Text>
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Опасная зона" tone="danger" description="Удаление необратимо">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Профиль и доступ к AutoCore будут удалены. Данные компании останутся у других участников.
          </Text>
          <Button
            onPress={deleteAccount.requestDelete}
            disabled={deleteAccount.loading}
            loading={deleteAccount.loading}
            style={{ backgroundColor: colors.destructive }}
          >
            Удалить аккаунт
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
