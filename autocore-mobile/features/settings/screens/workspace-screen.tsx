import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useSession, useActiveCompanyName } from '@/hooks';
import { useEntitlement } from '@/hooks/use-entitlement';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import { presentOrganizationSwitcher } from '@/features/organization/present-organization-switcher';
import { haptics } from '@/theme';

import { settingsRouteHref } from '../navigation';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { WorkspaceCompaniesSection } from '../components/workspace-companies-section';
import { WorkspaceHeroCard } from '../components/workspace-hero-card';
import { WorkspaceSubscriptionCard } from '../components/workspace-subscription-card';

export function WorkspaceScreen() {
  const router = useGuardedRouter();
  const { firebaseUser, memberships, refreshProfile } = useAuth();
  const { profile, companyId } = useSession();
  const { companyName, isLoading: isCompanyNameLoading } = useActiveCompanyName();
  const { entitlement } = useEntitlement();

  const canSwitchOrg = memberships.length > 1;

  return (
    <ProfileScreenShell title="Workspace" subtitle="Company, subscription, and sync">
      <WorkspaceHeroCard
        companyName={companyName}
        role={profile?.role ?? 'employee'}
        isOwner={profile?.isCompanyOwner === true}
        isLoading={isCompanyNameLoading}
        onPress={
          canSwitchOrg
            ? () => {
                haptics.selection();
                presentOrganizationSwitcher({
                  memberships,
                  activeCompanyId: companyId,
                  userId: firebaseUser?.uid,
                  refreshProfile,
                  router,
                });
              }
            : undefined
        }
        showSwitcherHint={canSwitchOrg}
      />

      <WorkspaceSubscriptionCard
        entitlement={entitlement}
        onManage={() => router.push(settingsRouteHref('subscription'))}
      />

      <WorkspaceCompaniesSection
        memberships={memberships}
        activeCompanyId={companyId}
        onCreateCompany={() => router.push('/(auth)/journey/company')}
        onJoinCompany={() => router.push('/(tabs)/profile/join-company')}
        onSwitchCompany={async (nextCompanyId) => {
          if (!firebaseUser) return;
          await switchActiveCompany(firebaseUser.uid, nextCompanyId);
          await refreshProfile();
          await NotificationService.syncInbox();
          haptics.selection();
        }}
      />
    </ProfileScreenShell>
  );
}
