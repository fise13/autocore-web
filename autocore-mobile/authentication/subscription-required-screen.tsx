import { PaywallScreen } from '@/features/subscription';

import { useAuth } from './auth-provider';

type SubscriptionRequiredScreenProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
};

/**
 * The gate shown to a signed-in user whose workspace has no active subscription.
 *
 * It *is* the paywall rather than a dead end pointing at the website: on iOS,
 * directing the user to an external purchase mechanism is what guideline 3.1.1
 * prohibits, and it was also simply a worse experience. The purchase happens
 * here, in-app, through StoreKit.
 */
export function SubscriptionRequiredScreen({
  onRefresh,
  refreshing = false,
}: SubscriptionRequiredScreenProps) {
  const { signOut } = useAuth();

  return (
    <PaywallScreen
      variant="gate"
      onRefresh={onRefresh}
      refreshing={refreshing}
      onSignOut={() => void signOut()}
    />
  );
}
