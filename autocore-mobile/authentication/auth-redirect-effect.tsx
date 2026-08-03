import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { journeyPathForStep, useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { isProductionCompanyId } from '@/lib/company-id';
import { resolveInitialTabHref } from '@/lib/navigation/nav-item-availability';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { isPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';

/**
 * Auth-state routing without `useSegments` in the effect deps.
 * Segment-driven replace loops overflowed the native nav stack.
 */
export function AuthRedirectEffect() {
  const router = useRouter();
  const lastTargetRef = useRef<string | null>(null);

  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);

  const isReady = status !== 'booting' && !isHydrating;
  const companyId = resolveSessionCompanyId(profile, memberships);
  const hasAccess =
    status === 'authenticated' &&
    !workspaceBlock &&
    profile?.isActive !== false &&
    isProductionCompanyId(companyId);

  const journeyStep = useAuthJourneyStep();
  const { isPro, isLoading: subscriptionLoading } = useCompanySubscription(companyId);
  const workOrdersEnabled = useCompanyModuleEnabled('workOrders');
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const accountingModuleEnabled = useCompanyModuleEnabled('accounting');

  useEffect(() => {
    if (!isReady) {
      lastTargetRef.current = null;
      return;
    }

    let target: string | null = null;

    if (!firebaseUser) {
      target = '/(auth)/login';
    } else if (journeyStep !== 'app') {
      target = journeyPathForStep(journeyStep);
    } else if (hasAccess && subscriptionLoading && !isPaywallBypassed()) {
      // Billing still resolving — AuthGate holds splash; do not push tabs yet.
      target = null;
    } else if (hasAccess && !isPro && !isPaywallBypassed()) {
      // Paywall is rendered by AuthGate, not a route.
      target = null;
    } else if (hasAccess && (isPro || isPaywallBypassed())) {
      target = resolveInitialTabHref({
        profile,
        modules: {
          workOrders: workOrdersEnabled,
          warehouse: warehouseEnabled,
          accounting: accountingModuleEnabled,
        },
      });
    }

    if (!target || lastTargetRef.current === target) return;
    lastTargetRef.current = target;
    router.replace(target as never);
  }, [
    accountingModuleEnabled,
    firebaseUser,
    hasAccess,
    isPro,
    isReady,
    journeyStep,
    profile,
    router,
    subscriptionLoading,
    warehouseEnabled,
    workOrdersEnabled,
  ]);

  return null;
}
