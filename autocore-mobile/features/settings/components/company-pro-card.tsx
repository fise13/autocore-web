import { CollectionRow } from '@/components/ui';
import { SubscriptionPlanSection } from '@/features/subscription/components/subscription-plan-section';
import type { Entitlement } from '@/lib/subscriptions/types';

type CompanyProCardProps = {
  entitlement: Entitlement;
  /** Billing belongs to the workspace owner; everyone else sees it read-only. */
  canManage: boolean;
  onSeePlans: () => void;
  onManage: () => void;
};

const UPGRADE_DETAIL = 'Unlimited engines, work orders, AI and reports';

/**
 * Subscription on the Company screen.
 *
 * Sits next to modules and team because the plan belongs to the workspace, not
 * the signed-in person. A non-owner sees state without a purchase control they
 * could not complete.
 */
export function CompanyProCard({
  entitlement,
  canManage,
  onSeePlans,
  onManage,
}: CompanyProCardProps) {
  const action = resolveAction(entitlement, canManage);

  return (
    <SubscriptionPlanSection entitlement={entitlement} footer={footerFor(entitlement, canManage)}>
      {action ? (
        <CollectionRow
          title={action.title}
          subtitle={action.subtitle}
          tone={action.tone}
          onPress={action.kind === 'upgrade' ? onSeePlans : onManage}
        />
      ) : null}
    </SubscriptionPlanSection>
  );
}

type Action = {
  kind: 'upgrade' | 'manage';
  title: string;
  subtitle?: string;
  tone: 'default' | 'danger';
};

function resolveAction(entitlement: Entitlement, canManage: boolean): Action | null {
  if (!canManage || entitlement.managedExternally) return null;

  if (entitlement.inGracePeriod) {
    return { kind: 'manage', title: 'Update payment', tone: 'danger' };
  }

  if (entitlement.isActive) {
    return { kind: 'manage', title: 'Manage subscription', tone: 'default' };
  }

  return {
    kind: 'upgrade',
    title: 'Upgrade to Pro',
    subtitle: UPGRADE_DETAIL,
    tone: 'default',
  };
}

function footerFor(entitlement: Entitlement, canManage: boolean): string | undefined {
  if (!canManage) return 'Only the workspace owner can change the subscription.';
  if (entitlement.managedExternally) {
    return 'Billed outside the App Store — changes are handled where it was set up.';
  }
  return undefined;
}
