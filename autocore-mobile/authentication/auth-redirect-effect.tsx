import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { journeyPathForStep, useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { isProductionCompanyId } from '@/lib/company-id';
import { resolveInitialTabHref } from '@/lib/navigation/nav-item-availability';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import {
  isPaywallBypassed,
  subscribePaywallBypass,
} from '@/lib/subscriptions/paywall-bypass';
import {
  getPurchaseStoreSnapshot,
  isCelebratingPurchasePhase,
  subscribePurchaseStore,
} from '@/lib/subscriptions/purchase-store';

/**
 * Auth-state routing without `useSegments` in the effect deps.
 * Segment-driven replace loops overflowed the native nav stack.
 */
function isDevSandboxPath(pathname: string): boolean {
  return pathname === '/design-system';
}

export function AuthRedirectEffect() {
  const router = useRouter();
  const pathname = usePathname();
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
  const paywallBypassed = useSyncExternalStore(
    subscribePaywallBypass,
    isPaywallBypassed,
    isPaywallBypassed,
  );
  const purchaseSnapshot = useSyncExternalStore(
    subscribePurchaseStore,
    getPurchaseStoreSnapshot,
    getPurchaseStoreSnapshot,
  );
  const holdingGateCelebration =
    purchaseSnapshot.gateCelebrationLock &&
    isCelebratingPurchasePhase(purchaseSnapshot.flow.phase);
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
      // Mock labs do not need a session; stay put instead of bouncing to login.
      target = __DEV__ && isDevSandboxPath(pathname) ? null : '/(auth)/login';
    } else if (journeyStep !== 'app') {
      target = journeyPathForStep(journeyStep);
    } else if (hasAccess && subscriptionLoading && !paywallBypassed) {
      // Billing still resolving — AuthGate holds splash; do not push tabs yet.
      target = null;
    } else if (hasAccess && holdingGateCelebration) {
      // Celebration is still on the gate paywall — tabs wait for Continue.
      target = null;
    } else if (hasAccess && !isPro && !paywallBypassed) {
      // Paywall is rendered by AuthGate, not a route.
      target = null;
    } else if (hasAccess && (isPro || paywallBypassed)) {
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
    holdingGateCelebration,
    isPro,
    isReady,
    journeyStep,
    pathname,
    paywallBypassed,
    profile,
    router,
    subscriptionLoading,
    warehouseEnabled,
    workOrdersEnabled,
  ]);

  return null;
}
