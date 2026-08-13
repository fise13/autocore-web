import {
  memo,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/store/auth-store';
import { AuthLoadingScreen } from '@/authentication/auth-loading-screen';
import { AuthRedirectEffect } from '@/authentication/auth-redirect-effect';
import { useAuthHasAccess } from '@/authentication/auth-provider';
import { armLoginRiseHandoff, clearLoginRiseHandoff } from '@/authentication/splash-handoff';
import { useWorkspaceAccessRealtime } from '@/hooks/use-workspace-access-realtime';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { markStartup } from '@/lib/performance/startup-tracer';
import { hideNativeSplashAndLogStartup } from '@/lib/splash';
import { SessionBootstrapGate } from '@/providers/session-bootstrap-gate';
import { FirestoreNetworkHead } from '@/providers/firestore-network-head';
import { IntakeSyncHead } from '@/providers/intake-sync-head';
import { OfflineSyncHead } from '@/providers/offline-sync-head';
import { SessionRealtimeHead } from '@/providers/session-realtime-head';
import { OfflineSessionBanner } from '@/components/offline/offline-session-banner';
import { AutocompleteProvider } from '@/providers/autocomplete-provider';
import { AutocompleteDataHead } from '@/providers/autocomplete-data-head';
import { MoneyFormatSync } from '@/providers/money-format-sync';
import { NotificationProvider } from '@/providers/notification-provider';
import { PushRegistrationHead } from '@/providers/push-registration-head';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { reconcile } from '@/lib/subscriptions/subscription-manager';
import {
  isPaywallBypassed,
  subscribePaywallBypass,
} from '@/lib/subscriptions/paywall-bypass';

/** Hard ceiling — covers dissolve + paced Claude rise-to-login (~1.2s). */
const SPLASH_EXIT_FAILSAFE_MS = 1600;

const paywallImport = () => import('@/authentication/subscription-required-screen');
const workspaceImport = () => import('@/authentication/workspace-access-screen');

const SubscriptionRequiredScreen = lazy(async () => {
  const mod = await paywallImport();
  return { default: mod.SubscriptionRequiredScreen };
});
const WorkspaceAccessScreen = lazy(async () => {
  const mod = await workspaceImport();
  return { default: mod.WorkspaceAccessScreen };
});

const MemoAppTree = memo(function MemoAppTree({ children }: { children: React.ReactNode }) {
  return (
    <AutocompleteProvider>
      <SessionRealtimeHead />
      <FirestoreNetworkHead />
      <OfflineSyncHead />
      <IntakeSyncHead />
      <AutocompleteDataHead />
      <MoneyFormatSync />
      <NotificationProvider enabled>
        <SessionBootstrapGate>
          {children}
          <OfflineSessionBanner />
        </SessionBootstrapGate>
      </NotificationProvider>
    </AutocompleteProvider>
  );
});

export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);

  const isOnline = useAuthStore((s) => s.isOnline);
  const isReady = status !== 'booting' && !isHydrating;
  const hasAccess = useAuthHasAccess();
  const isWorkspaceBlocked = Boolean(workspaceBlock);

  const journeyStep = useAuthJourneyStep();
  const companyId = resolveSessionCompanyId(profile, memberships);
  const { isPro, isLoading: subscriptionLoading } = useCompanySubscription(companyId);
  const [refreshing, setRefreshing] = useState(false);
  const [paywallModuleReady, setPaywallModuleReady] = useState(false);

  const paywallBypassed = useSyncExternalStore(
    subscribePaywallBypass,
    isPaywallBypassed,
    isPaywallBypassed,
  );

  const billingSettled = !subscriptionLoading || !isOnline;

  const needsSubscription =
    Boolean(firebaseUser) &&
    journeyStep === 'app' &&
    hasAccess &&
    billingSettled &&
    !isPro &&
    !paywallBypassed;

  const canEnterApp =
    Boolean(firebaseUser) &&
    journeyStep === 'app' &&
    hasAccess &&
    billingSettled &&
    (isPro || paywallBypassed);

  /**
   * Hold splash until Firestore billing settles (not just MMKV cache) and the
   * destination surface is painted underneath.
   */
  const awaitingBillingDecision =
    Boolean(firebaseUser) &&
    journeyStep === 'app' &&
    hasAccess &&
    !isWorkspaceBlocked &&
    subscriptionLoading &&
    isOnline &&
    !paywallBypassed;

  const holdingSplash =
    !isReady ||
    Boolean(firebaseUser && journeyStep === 'loading') ||
    awaitingBillingDecision ||
    (needsSubscription && !paywallModuleReady);

  const [splashMounted, setSplashMounted] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const exitArmedRef = useRef(false);
  const riseHandoffArmedRef = useRef(false);

  // Latch before login mounts under the overlay (effects run too late for take()).
  if (!holdingSplash && !firebaseUser && splashMounted && !riseHandoffArmedRef.current) {
    riseHandoffArmedRef.current = true;
    armLoginRiseHandoff();
  }

  useWorkspaceAccessRealtime(
    Boolean(firebaseUser) && journeyStep === 'app' && hasAccess && !isWorkspaceBlocked,
  );

  useEffect(() => {
    if (!firebaseUser || journeyStep !== 'app' || !hasAccess || paywallBypassed) {
      setPaywallModuleReady(true);
      return;
    }
    let cancelled = false;
    void paywallImport()
      .then(() => {
        if (!cancelled) setPaywallModuleReady(true);
      })
      .catch(() => {
        if (!cancelled) setPaywallModuleReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, hasAccess, journeyStep, paywallBypassed]);

  const dismissSplash = useCallback(() => {
    setSplashMounted(false);
    setSplashExiting(false);
    exitArmedRef.current = false;
    clearLoginRiseHandoff();
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!companyId) return;
    setRefreshing(true);
    try {
      await reconcile(companyId);
    } catch {
      // Listener picks up the change whenever billing next updates.
    } finally {
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isReady) {
      markStartup('auth_ready');
    }
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (hasAccess && (isPro || subscriptionLoading || paywallBypassed)) return;
    hideNativeSplashAndLogStartup();
  }, [isReady, hasAccess, isPro, subscriptionLoading, paywallBypassed]);

  useEffect(() => {
    if (holdingSplash) {
      exitArmedRef.current = false;
      riseHandoffArmedRef.current = false;
      setSplashMounted(true);
      setSplashExiting(false);
      return;
    }

    if (!splashMounted || exitArmedRef.current) return;
    exitArmedRef.current = true;
    setSplashExiting(true);

    const failsafe = setTimeout(dismissSplash, SPLASH_EXIT_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [dismissSplash, holdingSplash, splashMounted]);

  const pushRegistration = firebaseUser ? <PushRegistrationHead /> : null;
  const subscriptionHead = firebaseUser ? <SubscriptionProvider /> : null;

  const paywall = (
    <Suspense fallback={null}>
      <SubscriptionRequiredScreen
        onRefresh={() => void refreshSubscription()}
        refreshing={refreshing}
      />
    </Suspense>
  );

  const splashExitMode = firebaseUser ? 'dissolve' : 'rise';

  let body: ReactNode = null;
  if (needsSubscription && paywallModuleReady) {
    // Mount under splash before exit so fade reveals a painted paywall.
    body = paywall;
  } else if (canEnterApp) {
    body = <MemoAppTree>{children}</MemoAppTree>;
  } else if (!holdingSplash) {
    if (firebaseUser && journeyStep === 'app' && (isWorkspaceBlocked || !hasAccess)) {
      body = (
        <Suspense fallback={null}>
          <WorkspaceAccessScreen />
        </Suspense>
      );
    } else {
      // Login paints under the rising splash lockup.
      body = children;
    }
  }

  return (
    <>
      {isReady ? pushRegistration : null}
      {isReady ? subscriptionHead : null}
      <AuthRedirectEffect />
      {body}
      {splashMounted ? (
        <View
          style={holdingSplash ? styles.splashFill : styles.splashOverlay}
          pointerEvents={splashExiting ? 'none' : 'auto'}
        >
          <AuthLoadingScreen
            exiting={splashExiting}
            exitMode={splashExitMode}
            onExitComplete={dismissSplash}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  splashFill: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
