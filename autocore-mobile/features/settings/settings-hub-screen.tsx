import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardedRouter } from '@/hooks/use-guarded-router';

import {
  LayoutGridIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from '@/assets/icons';
import {
  SettingsInset,
  SettingsLinkRow,
  SettingsSectionCard,
  Text,
} from '@/components/ui';
import { UserAvatar } from '@/components/account/user-avatar';
import { useActiveCompanyName } from '@/hooks/use-active-company-name';
import { useSession, useCompanySubscription } from '@/hooks';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { useTheme } from '@/hooks/use-theme';
import { rhythm, spacing } from '@/theme';

import { settingsRouteHref } from './navigation';
import type { SettingsRouteId } from './types';

export function SettingsHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useGuardedRouter();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const { isPro } = useCompanySubscription(profile?.companyId);
  const { companyName } = useActiveCompanyName();

  const open = (id: SettingsRouteId) => {
    router.push(settingsRouteHref(id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingBottom: Math.max(insets.bottom, 16) + 96,
          gap: spacing[5],
        }}
      >
        <View style={{ paddingHorizontal: rhythm.pad, gap: rhythm.tight }}>
          <Text variant="pageTitle" style={{ color: colors.foreground }}>
            Настройки
          </Text>
          <Text variant="pageSubtitle" style={{ color: colors.mutedForeground }}>
            Аккаунт и рабочее пространство
          </Text>
        </View>

        <SettingsInset>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.stack }}>
            <UserAvatar
              displayName={profile?.displayName ?? 'Пользователь'}
              photoURL={photoURL}
              size="md"
            />
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text variant="body" style={{ fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                {profile?.displayName?.trim() || 'Пользователь'}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {companyName} · {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
        </SettingsInset>

        <SettingsSectionCard icon={UserRoundIcon} title="Аккаунт" description="Профиль и интерфейс">
          <SettingsLinkRow title="Аккаунт" value="Профиль и вход" onPress={() => open('account')} />
          <SettingsLinkRow title="Оформление" value="Тема и акцент" bordered onPress={() => open('appearance')} />
          <SettingsLinkRow title="Уведомления" value="Push и email" bordered onPress={() => open('notifications')} />
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={LayoutGridIcon}
          title="Рабочее пространство"
          description="Компания и команда"
        >
          <SettingsLinkRow
            title="Рабочее пространство"
            value="Компания и синхронизация"
            onPress={() => open('workspace')}
          />
          <SettingsLinkRow title="Компания" value="Регион и облако" bordered onPress={() => open('company')} />
          <SettingsLinkRow title="Команда и роли" value="Сотрудники" bordered onPress={() => open('team')} />
        </SettingsSectionCard>

        <SettingsSectionCard icon={SparklesIcon} title="Продукт" description="Навигация">
          <SettingsLinkRow title="Навигация" value="Нижняя панель" onPress={() => open('navigation')} />
          <SettingsLinkRow title="Бухгалтерия" value="Финансы компании" bordered onPress={() => open('accounting')} />
        </SettingsSectionCard>

        <SettingsSectionCard icon={SettingsIcon} title="Система" description="Данные и кэш">
          <SettingsLinkRow title="Расширенные" value="Экспорт и опасная зона" onPress={() => open('advanced')} />
        </SettingsSectionCard>
      </ScrollView>
    </View>
  );
}
