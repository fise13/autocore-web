import { useState } from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useSession, useCompanySubscription, useActiveCompanyName } from '@/hooks';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { haptics } from '@/theme';
import { Button } from '@/components/ui';
import { CompanySwitcherSheet } from '@/features/organization/components/company-switcher-sheet';

import { WORKSPACE_DEMO } from '../data/demo-data';
import { settingsRouteHref } from '../navigation';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { WorkspaceCompaniesSection } from '../components/workspace-companies-section';
import { WorkspaceHeroCard } from '../components/workspace-hero-card';
import { WorkspaceStorageCard } from '../components/workspace-storage-card';
import { WorkspaceSubscriptionCard } from '../components/workspace-subscription-card';

export function WorkspaceScreen() {
  const router = useGuardedRouter();
  const { firebaseUser, memberships, refreshProfile } = useAuth();
  const { profile, companyId } = useSession();
  const { companyName, isLoading: isCompanyNameLoading } = useActiveCompanyName();
  const { subscription, isPro } = useCompanySubscription(companyId);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const storagePct = (WORKSPACE_DEMO.storageUsed.usedGb / WORKSPACE_DEMO.storageUsed.totalGb) * 100;

  return (
    <ProfileScreenShell title="Рабочее пространство" subtitle="Компания, подписка и синхронизация">
      {memberships.length > 1 ? (
        <Button variant="secondary" onPress={() => setSwitcherOpen(true)}>
          Сменить организацию ({memberships.length})
        </Button>
      ) : null}

      <WorkspaceHeroCard
        companyName={companyName}
        role={profile?.role ?? 'employee'}
        isOwner={profile?.isCompanyOwner === true}
        isPro={isPro}
        isLoading={isCompanyNameLoading}
      />

      <WorkspaceSubscriptionCard
        isPro={isPro}
        subscription={subscription}
        onManage={() => router.push(settingsRouteHref('subscription'))}
      />

      <WorkspaceStorageCard
        usedLabel={WORKSPACE_DEMO.storageUsed.label}
        usedPct={storagePct}
        syncStatus={WORKSPACE_DEMO.cloudSync.status}
        syncMeta={`${WORKSPACE_DEMO.cloudSync.lastSync} · ${WORKSPACE_DEMO.cloudSync.devices} устройства`}
      />

      <WorkspaceCompaniesSection
        memberships={memberships}
        activeCompanyId={companyId}
        onCreateCompany={() => {}}
        onJoinCompany={() => router.push('/(tabs)/profile/join-company')}
        onSwitchCompany={async (nextCompanyId) => {
          if (!firebaseUser) return;
          await switchActiveCompany(firebaseUser.uid, nextCompanyId);
          await refreshProfile();
          haptics.selection();
        }}
      />
      <CompanySwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </ProfileScreenShell>
  );
}
