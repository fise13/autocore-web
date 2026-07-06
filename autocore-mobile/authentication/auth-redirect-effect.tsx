import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { journeyPathForStep, useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { isProductionCompanyId } from '@/lib/company-id';
import { resolveInitialTabHref } from '@/lib/navigation/nav-item-availability';
import { canAccessMissionControl } from '@/lib/rbac/navigation-policy';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { useNavigationConfigStore } from '@/features/settings/store/navigation-config-store';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';

/**
 * Headless auth routing — owns segment subscriptions so AuthGate UI
 * does not re-render on every tab switch.
 */
export function AuthRedirectEffect() {
  const router = useRouter();
  const segments = useSegments();
  const lastRedirectRef = useRef<string | null>(null);
  const sessionTabBootRef = useRef(false);

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
  const navOrder = useNavigationConfigStore((s) => s.order);
  const navEnabled = useNavigationConfigStore((s) => s.enabled);
  const workOrdersEnabled = useCompanyModuleEnabled('workOrders');
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const accountingModuleEnabled = useCompanyModuleEnabled('accounting');

  useEffect(() => {
    if (!isReady) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inTabs = root === '(tabs)';
    const inInvite = root === 'invite';
    const inJourney = inAuthGroup && segments[1] === 'journey';
    const onLogin = inAuthGroup && segments[1] === 'login';
    const onForgot = inAuthGroup && segments[1] === 'forgot-password';

    const redirect = (href: string) => {
      if (lastRedirectRef.current === href) return;
      lastRedirectRef.current = href;
      router.replace(href as never);
    };

    const isGenericTabEntry =
      inTabs &&
      (segments.length === 1 || (segments.length === 2 && segments[1] === 'index'));

    const initialTab = resolveInitialTabHref({
      profile,
      navOrder,
      navEnabled,
      modules: {
        workOrders: workOrdersEnabled,
        warehouse: warehouseEnabled,
        accounting: accountingModuleEnabled,
      },
    });

    if (!firebaseUser) {
      if (!onLogin && !onForgot && !inInvite) {
        redirect('/(auth)/login');
      }
      return;
    }

    if (inInvite) {
      return;
    }

    if (journeyStep !== 'app') {
      const target = journeyPathForStep(journeyStep);
      if (target && (!inJourney || segments[2] !== journeyStep)) {
        redirect(target);
      }
      return;
    }

    if (hasAccess && !subscriptionLoading && !isPro) {
      return;
    }

    if (hasAccess && (isPro || subscriptionLoading)) {
      if (!inTabs) {
        redirect(initialTab);
        return;
      }

      if (isGenericTabEntry && !sessionTabBootRef.current) {
        sessionTabBootRef.current = true;
        redirect(initialTab);
        return;
      }

      const onMission =
        segments.length === 2 &&
        segments[1] === 'index' &&
        profile &&
        !canAccessMissionControl(profile);
      if (onMission) {
        redirect(initialTab);
      }
    }
  }, [
    firebaseUser,
    hasAccess,
    isPro,
    isReady,
    journeyStep,
    router,
    segments,
    subscriptionLoading,
    profile,
    navOrder,
    navEnabled,
    workOrdersEnabled,
    warehouseEnabled,
    accountingModuleEnabled,
  ]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [segments]);

  return null;
}
