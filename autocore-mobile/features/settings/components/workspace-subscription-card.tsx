import { usePaywall } from '@/hooks/use-paywall';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useSession } from '@/hooks';

import { CompanyProCard } from './company-pro-card';

type WorkspaceSubscriptionCardProps = {
  onManage: () => void;
};

/**
 * Same island as Company settings — the plan is a workspace fact, so both
 * surfaces must agree on status, copy, and actions.
 */
export function WorkspaceSubscriptionCard({ onManage }: WorkspaceSubscriptionCardProps) {
  const { entitlement } = useEntitlement();
  const { profile } = useSession();
  const { present } = usePaywall();

  return (
    <CompanyProCard
      entitlement={entitlement}
      canManage={profile?.isCompanyOwner === true}
      onSeePlans={() => present()}
      onManage={onManage}
    />
  );
}
