import { CollectionRow, ListSection, Surface, Text } from '@/components/ui';
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
import { usePaywall } from '@/hooks/use-paywall';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { CompanyModuleKey } from '@/types/company-config';
import { presentOrganizationSwitcher } from '@/features/organization/present-organization-switcher';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { appDisplayCurrencyOption } from '@/lib/money/display-currency';

import { settingsRouteHref } from '../navigation';
import { CompanyProCard } from '../components/company-pro-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
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
  const { memberships, refreshProfile, firebaseUser } = useAuth();
  const { profile, companyId } = useSession();
  const { name, isLoading } = useCompanyProfile(companyId);
  const { config } = useCompanyAppConfig(companyId);
  const { entitlement, isPro } = useEntitlement();
  const { employees } = useEmployeesRealtime(companyId, isPro);
  const { currency } = useAppDisplayCurrency();
  const { present: presentPaywall } = usePaywall();
  const activeCount = employees.filter((entry) => entry.isActive).length;

  const displayName = isLoading ? '…' : resolveActiveCompanyName(companyId, name, []);
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

  return (
    <ProfileScreenShell title="Company" subtitle="Organization profile">
      <Surface
        variant="inset"
        style={{
          marginBottom: tokens.space.section,
          borderRadius: tokens.radius.group,
        }}
      >
        <Text variant="title3" numberOfLines={2} style={{ color: colors.foreground }}>
          {displayName}
        </Text>
        <Text variant="footnote" color="muted">
          {activeCount} active
        </Text>
      </Surface>

      <CompanyProCard
        entitlement={entitlement}
        canManage={profile?.isCompanyOwner === true}
        onSeePlans={() => presentPaywall()}
        onManage={() => router.push(settingsRouteHref('subscription'))}
      />

      <ListSection title="Organizations">
        <CollectionRow
          title="Switch organization"
          subtitle={displayName}
          onPress={() => {
            haptics.selection();
            presentOrganizationSwitcher({
              memberships,
              activeCompanyId: companyId,
              userId: firebaseUser?.uid,
              refreshProfile,
              router,
            });
          }}
        />
      </ListSection>

      <ListSection title="Workspace">
        <CollectionRow
          title="Modules"
          value={modulesValue}
          onPress={() => router.push(settingsRouteHref('modules'))}
        />
        {profile?.isCompanyOwner ? (
          <CollectionRow title="Team" onPress={() => router.push(settingsRouteHref('team'))} />
        ) : null}
        <CollectionRow
          title="Display currency"
          value={currencyLabel}
          onPress={() => router.push(profileRouteHref('currency'))}
        />
      </ListSection>

      <OrgDangerZone
        companyName={name ?? 'Company'}
        isOwner={profile?.isCompanyOwner === true}
        onChanged={() => void refreshProfile()}
      />
    </ProfileScreenShell>
  );
}
