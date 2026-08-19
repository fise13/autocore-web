import { toast } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useSession, useActiveCompanyName } from '@/hooks';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { runCompanySwitch, useCompanySwitchState } from '@/lib/session/company-switch-controller';
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
  const switching = useCompanySwitchState();

  const openSwitcher = () => {
    haptics.selection();
    presentOrganizationSwitcher({
      memberships,
      activeCompanyId: companyId,
      userId: firebaseUser?.uid,
      refreshProfile,
      router,
    });
  };

  return (
    <ProfileScreenShell title="Workspace" subtitle="Company, subscription, and sync">
      <WorkspaceHeroCard
        companyName={companyName}
        role={profile?.role ?? 'employee'}
        isOwner={profile?.isCompanyOwner === true}
        isLoading={isCompanyNameLoading}
        onPress={openSwitcher}
        showSwitcherHint
      />

      <WorkspaceSubscriptionCard onManage={() => router.push(settingsRouteHref('subscription'))} />

      <WorkspaceCompaniesSection
        memberships={memberships}
        activeCompanyId={companyId}
        switchingCompanyId={switching?.companyId ?? null}
        onCreateCompany={() => router.push('/(auth)/journey/company')}
        onJoinCompany={() => router.push('/(tabs)/profile/join-company')}
        onSwitchCompany={async (nextCompanyId) => {
          if (!firebaseUser || switching) return;
          const membership = memberships.find((entry) => entry.companyId === nextCompanyId);
          const nextName = resolveActiveCompanyName(
            nextCompanyId,
            membership?.name,
            [],
          );
          try {
            await runCompanySwitch({
              userId: firebaseUser.uid,
              companyId: nextCompanyId,
              companyName: nextName,
              refreshProfile,
            });
            haptics.success();
          } catch (error) {
            haptics.warning();
            toast({
              title: "Couldn't switch organization",
              description: error instanceof Error ? error.message : undefined,
              variant: 'destructive',
            });
          }
        }}
      />
    </ProfileScreenShell>
  );
}
