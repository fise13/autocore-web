import { useState } from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useSession, useCompanySubscription, useActiveCompanyName } from '@/hooks';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import { haptics } from '@/theme';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';

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
  const { subscription, isPro } = useCompanySubscription(companyId);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const canSwitchOrg = memberships.length > 1;

  return (
    <ProfileScreenShell title="Рабочее пространство" subtitle="Компания, подписка и синхронизация">
      <WorkspaceHeroCard
        companyName={companyName}
        role={profile?.role ?? 'employee'}
        isOwner={profile?.isCompanyOwner === true}
        isPro={isPro}
        isLoading={isCompanyNameLoading}
        onPress={canSwitchOrg ? () => setSwitcherOpen(true) : undefined}
        showSwitcherHint={canSwitchOrg}
      />

      <WorkspaceSubscriptionCard
        isPro={isPro}
        subscription={subscription}
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
      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </ProfileScreenShell>
  );
}
