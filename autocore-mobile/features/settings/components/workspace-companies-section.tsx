import { SettingsLinkRow, SettingsSectionCard } from '@/components/ui';
import { haptics } from '@/theme';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import type { UserCompanyMembership } from '@/types/rbac';

import { OrganizationMembershipRow } from '@/features/organization/components/organization-membership-row';

type WorkspaceCompaniesSectionProps = {
  memberships: UserCompanyMembership[];
  activeCompanyId: string;
  onCreateCompany?: () => void;
  onJoinCompany?: () => void;
  onSwitchCompany: (companyId: string) => void;
};

export function WorkspaceCompaniesSection({
  memberships,
  activeCompanyId,
  onCreateCompany,
  onJoinCompany,
  onSwitchCompany,
}: WorkspaceCompaniesSectionProps) {
  return (
    <SettingsSectionCard title="Companies" description="Switch workspace">
      <SettingsLinkRow
        title="Join a company"
        subtitle="Via link or invite code"
        onPress={() => {
          haptics.selection();
          onJoinCompany?.();
        }}
      />
      <SettingsLinkRow
        bordered
        title="Create a company"
        subtitle="New workspace"
        onPress={() => {
          haptics.selection();
          onCreateCompany?.();
        }}
      />
      {memberships.map((membership, index) => {
        const active = membership.companyId === activeCompanyId;
        const displayName = resolveActiveCompanyName(membership.companyId, membership.name, []);
        const subtitle = active
          ? `${formatRole(membership.role)} · active`
          : formatRole(membership.role);

        return (
          <OrganizationMembershipRow
            key={membership.companyId}
            companyId={membership.companyId}
            title={displayName}
            subtitle={subtitle}
            active={active}
            bordered
            onPress={active ? undefined : () => onSwitchCompany(membership.companyId)}
          />
        );
      })}
    </SettingsSectionCard>
  );
}
