import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useAuth } from '@/authentication/auth-provider';
import {
  useAppDisplayCurrency,
  useCompanyAppConfig,
  useCompanyProfile,
  useEmployeesRealtime,
  useSession,
  useTheme,
} from '@/hooks';
import { useEntitlement } from '@/hooks/use-entitlement';
import { planLabel } from '@/lib/subscriptions/format';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { CompanyModuleKey } from '@/types/company-config';
import { rhythm } from '@/theme';
import { appDisplayCurrencyOption } from '@/lib/money/display-currency';

import { settingsRouteHref } from '../navigation';
import { settingsLayout } from '../layout';
import { SettingsGroup, SettingsSectionTitle } from '../components/settings-section';
import { SettingsRow } from '../components/settings-row';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';
import { OrganizationSwitchButton } from '@/features/organization/components/organization-switch-button';
import { OrgDangerZone } from '@/features/organization/components/org-danger-zone';
import { profileRouteHref } from '@/features/profile/navigation';

const MODULE_LABELS: Record<CompanyModuleKey, string> = {
  motors: 'Engines',
  workOrders: 'Work Orders',
  accounting: 'Accounting',
  warehouse: 'Warehouse',
  specifics: 'Categories',
};

export function CompanySettingsScreen() {
  const { colors } = useTheme();
  const router = useGuardedRouter();
  const { memberships, refreshProfile } = useAuth();
  const { profile, companyId } = useSession();
  const { name, isLoading } = useCompanyProfile(companyId);
  const { config } = useCompanyAppConfig(companyId);
  const { entitlement, isPro } = useEntitlement();
  const { employees } = useEmployeesRealtime(companyId, isPro);
  const { currency } = useAppDisplayCurrency();
  const activeCount = employees.filter((entry) => entry.isActive).length;
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const displayName = isLoading ? '…' : resolveActiveCompanyName(companyId, name, []);
  const currentPlanLabel = planLabel(entitlement);
  const currencyLabel = appDisplayCurrencyOption(currency).label;

  const enabledModules = config
    ? (Object.entries(config.modules) as Array<[CompanyModuleKey, boolean]>)
        .filter(([, on]) => on !== false)
        .map(([key]) => MODULE_LABELS[key])
    : [];

  const modulesValue =
    enabledModules.length === 0
      ? isLoading || !config
        ? '…'
        : 'None'
      : enabledModules.length <= 2
        ? enabledModules.join(' · ')
        : `${enabledModules.length} active`;

  const identityMeta = `${currentPlanLabel} · ${activeCount} active`;

  return (
    <ProfileScreenShell title="Company" subtitle="Organization profile">
      <View style={{ gap: rhythm.section }}>
        <View style={{ paddingHorizontal: settingsLayout.pad, gap: 6, paddingTop: 4 }}>
          <Text
            variant="heading"
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.55,
              lineHeight: 34,
              color: colors.foreground,
            }}
            numberOfLines={2}
          >
            {displayName}
          </Text>
          <Text
            variant="caption"
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: colors.mutedForeground,
            }}
          >
            {identityMeta}
          </Text>
        </View>

        {memberships.length > 1 ? (
          <View style={{ gap: rhythm.stack }}>
            <SettingsSectionTitle title="Organizations" />
            <SettingsGroup>
              <OrganizationSwitchButton
                companyName={displayName}
                onPress={() => setSwitcherOpen(true)}
              />
            </SettingsGroup>
          </View>
        ) : null}

        <View style={{ gap: rhythm.stack }}>
          <SettingsSectionTitle title="Workspace" />
          <SettingsGroup>
            <SettingsRow
              label="Modules"
              value={modulesValue}
              onPress={() => router.push(settingsRouteHref('modules'))}
            />
            {profile?.isCompanyOwner ? (
              <SettingsRow
                label="Team & Roles"
                onPress={() => router.push(settingsRouteHref('team'))}
              />
            ) : null}
            <SettingsRow
              label="Display currency"
              value={currencyLabel}
              onPress={() => router.push(profileRouteHref('currency'))}
            />
          </SettingsGroup>
        </View>

        <OrgDangerZone
          companyName={name ?? 'Company'}
          isOwner={profile?.isCompanyOwner === true}
          onChanged={() => void refreshProfile()}
        />
      </View>

      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </ProfileScreenShell>
  );
}
