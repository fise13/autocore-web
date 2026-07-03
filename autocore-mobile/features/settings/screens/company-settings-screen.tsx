import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import {
  useCompanyAppConfig,
  useCompanyProfile,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
  useTheme,
} from '@/hooks';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import type { CompanyModuleKey } from '@/types/company-config';
import { toneBackground } from '@/theme/color-utils';

import { WORKSPACE_DEMO } from '../data/demo-data';
import { settingsRouteHref } from '../navigation';
import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

const MODULE_LABELS: Record<CompanyModuleKey, string> = {
  motors: 'Двигатели',
  workOrders: 'Наряды',
  accounting: 'Бухгалтерия',
  warehouse: 'Склад',
  specifics: 'Категории',
};

export function CompanySettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, companyId } = useSession();
  const { name, isLoading } = useCompanyProfile(companyId);
  const { config } = useCompanyAppConfig(companyId);
  const { isPro } = useCompanySubscription(companyId);
  const { employees } = useEmployeesRealtime(companyId, isPro);
  const activeCount = employees.filter((entry) => entry.isActive).length;

  const enabledModules = config
    ? (Object.entries(config.modules) as Array<[CompanyModuleKey, boolean]>)
        .filter(([, on]) => on !== false)
        .map(([key]) => MODULE_LABELS[key])
    : [];

  return (
    <ProfileScreenShell title="Компания" subtitle="Профиль организации и инфраструктура">
      <ProfileMetaCard title="Основное" delay={60}>
        <ProfileMetaRow label="Название" value={isLoading ? '…' : name ?? 'MotorLand Service'} />
        <ProfileMetaRow label="Подписка" value={subscriptionPlanLabel(isPro)} />
        <ProfileMetaRow label="Сотрудники" value={`${activeCount} активных`} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Инфраструктура" delay={100}>
        <ProfileMetaRow label="Регион" value={WORKSPACE_DEMO.region} />
        <ProfileMetaRow label="Часовой пояс" value={WORKSPACE_DEMO.timezone} />
        <ProfileMetaRow label="Хранилище" value={WORKSPACE_DEMO.storageUsed.label} />
        <ProfileMetaRow label="Облако" value={WORKSPACE_DEMO.cloudSync.status} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Код приглашения" delay={140}>
        <Text variant="heading" style={{ fontSize: 26, fontWeight: '700', letterSpacing: 2.5 }}>
          {WORKSPACE_DEMO.inviteCode}
        </Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Поделитесь кодом с новым сотрудником для быстрого подключения.
        </Text>
      </ProfileMetaCard>

      <ProfileMetaCard title="Активные модули" delay={180}>
        {enabledModules.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {enabledModules.map((label) => (
              <View
                key={label}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: toneBackground(colors.primary, 0.1),
                }}
              >
                <Text variant="caption" style={{ fontWeight: '600', color: colors.primary }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" color="muted">
            Загрузка конфигурации…
          </Text>
        )}
        <Button variant="secondary" onPress={() => router.push(settingsRouteHref('modules'))}>
          Управление модулями
        </Button>
      </ProfileMetaCard>

      {profile?.isCompanyOwner ? (
        <ProfileMetaCard delay={220}>
          <Button onPress={() => router.push(settingsRouteHref('team'))}>Команда и роли</Button>
        </ProfileMetaCard>
      ) : null}
    </ProfileScreenShell>
  );
}
