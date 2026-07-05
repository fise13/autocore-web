import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import {
  useCompanyAppConfig,
  useCompanyProfile,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
  useTheme,
} from '@/hooks';
import type { CompanyModuleKey } from '@/types/company-config';

import { ProfileMetaCard, ProfileMetaRow } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';
import { profileRouteHref } from '../navigation';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

const MODULE_LABELS: Record<CompanyModuleKey, string> = {
  motors: 'Двигатели',
  workOrders: 'Наряды',
  accounting: 'Бухгалтерия',
  warehouse: 'Склад',
  specifics: 'Категории',
};

export function CompanyScreen() {
  const { colors } = useTheme();
  const router = useGuardedRouter();
  const { profile, companyId } = useSession();
  const { name, isLoading } = useCompanyProfile(companyId);
  const { config } = useCompanyAppConfig(companyId);
  const { isPro } = useCompanySubscription(companyId);
  const { employees } = useEmployeesRealtime(companyId, isPro);
  const activeCount = employees.filter((entry) => entry.isActive).length;

  const enabledModules = config
    ? (Object.entries(config.modules) as Array<[CompanyModuleKey, boolean]>)
        .filter(([, enabled]) => enabled !== false)
        .map(([key]) => MODULE_LABELS[key])
    : [];

  return (
    <ProfileScreenShell title="Компания" subtitle="Рабочее пространство и модули">
      <ProfileMetaCard title="Основное" delay={80}>
        <ProfileMetaRow label="Название" value={isLoading ? '…' : name ?? '—'} />
        <ProfileMetaRow label="Ваша роль" value={ROLE_LABELS[profile?.role ?? 'employee'] ?? 'Сотрудник'} />
        {profile?.isCompanyOwner ? <ProfileMetaRow label="Статус" value="Владелец компании" /> : null}
      </ProfileMetaCard>

      <ProfileMetaCard title="Модули" delay={120}>
        {enabledModules.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {enabledModules.map((label) => (
              <View
                key={label}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: colors.muted,
                }}
              >
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" color="muted">
            {config ? 'Модули не настроены' : 'Загрузка конфигурации…'}
          </Text>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard title="Команда" delay={160}>
        <ProfileMetaRow
          label="Сотрудники"
          value={isPro ? `${activeCount} активных` : 'Доступно на Pro'}
        />
        <Button onPress={() => router.push(profileRouteHref('team'))}>
          Управление командой
        </Button>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
