import { useState } from 'react';
import { View } from 'react-native';

import { Button, SectionHeader, Text } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useAuth } from '@/authentication/auth-provider';
import {
  useCompanyAppConfig,
  useCompanyProfile,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
  useTheme,
} from '@/hooks';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { CompanyModuleKey } from '@/types/company-config';
import { toneBackground } from '@/theme/color-utils';

import { settingsRouteHref } from '../navigation';
import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';
import { OrganizationSwitchButton } from '@/features/organization/components/organization-switch-button';
import { OrgDangerZone } from '@/features/organization/components/org-danger-zone';

const MODULE_LABELS: Record<CompanyModuleKey, string> = {
  motors: 'Двигатели',
  workOrders: 'Наряды',
  accounting: 'Бухгалтерия',
  warehouse: 'Склад',
  specifics: 'Категории',
};

export function CompanySettingsScreen() {
  const { colors } = useTheme();
  const router = useGuardedRouter();
  const { memberships, refreshProfile } = useAuth();
  const { profile, companyId } = useSession();
  const { name, isLoading } = useCompanyProfile(companyId);
  const { config } = useCompanyAppConfig(companyId);
  const { isPro } = useCompanySubscription(companyId);
  const { employees } = useEmployeesRealtime(companyId, isPro);
  const activeCount = employees.filter((entry) => entry.isActive).length;
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const enabledModules = config
    ? (Object.entries(config.modules) as Array<[CompanyModuleKey, boolean]>)
        .filter(([, on]) => on !== false)
        .map(([key]) => MODULE_LABELS[key])
    : [];

  return (
    <ProfileScreenShell title="Компания" subtitle="Профиль организации и инфраструктура">
      {memberships.length > 1 ? (
        <>
          <SectionHeader title="Организации" label inset />
          <OrganizationSwitchButton
            companyName={isLoading ? '…' : resolveActiveCompanyName(companyId, name, [])}
            onPress={() => setSwitcherOpen(true)}
          />
        </>
      ) : null}

      <ProfileMetaCard title="Основное" delay={60}>
        <ProfileMetaRow label="Название" value={isLoading ? '…' : name ?? '—'} />
        <ProfileMetaRow label="Подписка" value={subscriptionPlanLabel(isPro)} />
        <ProfileMetaRow label="Сотрудники" value={`${activeCount} активных`} />
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

      <OrgDangerZone
        companyName={name ?? 'Компания'}
        isOwner={profile?.isCompanyOwner === true}
        onChanged={() => void refreshProfile()}
      />

      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </ProfileScreenShell>
  );
}
