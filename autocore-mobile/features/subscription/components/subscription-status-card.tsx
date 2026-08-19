import type { Entitlement } from '@/lib/subscriptions/types';

import { SubscriptionPlanSection } from './subscription-plan-section';

export { TrialCountdown } from './trial-countdown';

type SubscriptionStatusCardProps = {
  entitlement: Entitlement;
};

/** Settings island for the current plan. Prefer this from manage/company screens. */
export function SubscriptionStatusCard({ entitlement }: SubscriptionStatusCardProps) {
  return <SubscriptionPlanSection entitlement={entitlement} title="Plan" />;
}
