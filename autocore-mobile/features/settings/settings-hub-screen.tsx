import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BarChart3Icon,
  BellIcon,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
} from '@/assets/icons';
import { Text } from '@/components/ui';
import { UserAvatar } from '@/components/account/user-avatar';
import { useAuth } from '@/authentication/auth-provider';
import { useActiveCompanyName } from '@/hooks/use-active-company-name';
import { useSession, useCompanySubscription } from '@/hooks';
import { useUserPhotoUrl } from '@/hooks/use-user-photo';
import { useTheme } from '@/hooks/use-theme';

import { SettingsHubCard } from './components/settings-hub-card';
import { settingsLayout } from './layout';
import { settingsRouteHref } from './navigation';
import type { SettingsHubCard as SettingsHubCardModel, SettingsHubSectionId } from './types';

const HUB_SECTIONS: SettingsHubCardModel[] = [
  {
    id: 'account',
    title: 'Аккаунт',
    subtitle: 'Профиль, вход, язык и тема',
    icon: UserRoundIcon,
  },
  {
    id: 'workspace',
    title: 'Рабочее пространство',
    subtitle: 'Компания, подписка и синхронизация',
    icon: LayoutGridIcon,
  },
  {
    id: 'navigation',
    title: 'Навигация',
    subtitle: 'Настройте нижнюю панель под себя',
    icon: SettingsIcon,
  },
  {
    id: 'modules',
    title: 'Модули',
    subtitle: 'Включайте только нужные разделы',
    icon: SparklesIcon,
  },
  {
    id: 'company',
    title: 'Компания',
    subtitle: 'Регион, облако и код приглашения',
    icon: StoreIcon,
  },
  {
    id: 'team',
    title: 'Команда и роли',
    subtitle: 'Сотрудники, права и приглашения',
    icon: UsersIcon,
    tone: 'pro',
  },
  {
    id: 'accounting',
    title: 'Бухгалтерия',
    subtitle: 'Валюта, налоги, payroll и счета',
    icon: ReceiptIcon,
  },
  {
    id: 'appearance',
    title: 'Оформление',
    subtitle: 'Тема, акцент и плотность',
    icon: SparklesIcon,
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    subtitle: 'Push, email и бизнес-события',
    icon: BellIcon,
  },
  {
    id: 'advanced',
    title: 'Расширенные',
    subtitle: 'Экспорт, кэш и опасная зона',
    icon: BarChart3Icon,
  },
];

export function SettingsHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useSession();
  const { memberships } = useAuth();
  const photoURL = useUserPhotoUrl();
  const { isPro } = useCompanySubscription(profile?.companyId);
  const { companyName } = useActiveCompanyName();

  const open = (id: SettingsHubSectionId) => {
    router.push(settingsRouteHref(id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16) + 96,
          gap: settingsLayout.section,
        }}
      >
        <View style={{ paddingHorizontal: settingsLayout.pad, gap: 20 }}>
          <View style={{ gap: 6 }}>
            <Text variant="heading" style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }}>
              Настройки
            </Text>
            <Text variant="body" color="muted" style={{ fontSize: 15, lineHeight: 22 }}>
              Настройте AutoCore под свой бизнес
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: settingsLayout.cardRadius,
              borderWidth: settingsLayout.hairline,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <UserAvatar displayName={profile?.displayName ?? 'Пользователь'} photoURL={photoURL} size="md" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="body" style={{ fontSize: 16, fontWeight: '700' }}>
                {profile?.displayName?.trim() || 'Пользователь'}
              </Text>
              <Text variant="caption" color="muted">
                {companyName}
              </Text>
              <Text variant="caption" style={{ fontWeight: '600', color: isPro ? '#7c3aed' : colors.primary }}>
                {isPro ? 'Pro · Все модули' : 'Базовый план'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {HUB_SECTIONS.map((section, index) => (
            <SettingsHubCard
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              icon={section.icon}
              tone={section.tone}
              delay={80 + index * settingsLayout.stagger}
              onPress={() => open(section.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
