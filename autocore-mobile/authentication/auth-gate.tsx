import { memo, useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/store/auth-store';
import { AuthLoadingScreen } from '@/authentication/auth-loading-screen';
import { AuthRedirectEffect } from '@/authentication/auth-redirect-effect';
import { SubscriptionRequiredScreen } from '@/authentication/subscription-required-screen';
import { useAuthHasAccess } from '@/authentication/auth-provider';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { markStartup } from '@/lib/performance/startup-tracer';
import { hideNativeSplashOnce } from '@/lib/splash';
import { SessionBootstrapGate } from '@/providers/session-bootstrap-gate';
import { SessionRealtimeHead } from '@/providers/session-realtime-head';
import { MoneyFormatSync } from '@/providers/money-format-sync';
import { refreshCompanyBilling } from '@/services/api/billing';

const MemoAppTree = memo(function MemoAppTree({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionRealtimeHead />
      <MoneyFormatSync />
      <SessionBootstrapGate>{children}</SessionBootstrapGate>
    </>
  );
});

export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);

  const isReady = status !== 'booting' && !isHydrating;
  const hasAccess = useAuthHasAccess();
  usePushNotifications(hasAccess);

  const journeyStep = useAuthJourneyStep();
  const companyId = resolveSessionCompanyId(profile, memberships);
  const { isPro, isLoading: subscriptionLoading } = useCompanySubscription(companyId);
  const [refreshing, setRefreshing] = useState(false);

  const needsSubscription =
    Boolean(firebaseUser) && journeyStep === 'app' && hasAccess && !subscriptionLoading && !isPro;

  const refreshSubscription = useCallback(async () => {
    if (!companyId) return;
    setRefreshing(true);
    try {
      await refreshCompanyBilling(companyId);
    } catch {
      // Listener will pick up changes when billing updates on the web.
    } finally {
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isReady) {
      markStartup('auth_ready');
      hideNativeSplashOnce();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <>
        <AuthRedirectEffect />
        <AuthLoadingScreen
          message={firebaseUser ? 'Синхронизация данных…' : 'Загрузка…'}
        />
      </>
    );
  }

  if (firebaseUser && journeyStep === 'loading') {
    return (
      <>
        <AuthRedirectEffect />
        <AuthLoadingScreen message="Подготовка рабочего пространства…" />
      </>
    );
  }

  if (needsSubscription) {
    return (
      <>
        <AuthRedirectEffect />
        <SubscriptionRequiredScreen onRefresh={() => void refreshSubscription()} refreshing={refreshing} />
      </>
    );
  }

  if (hasAccess && (isPro || subscriptionLoading)) {
    return (
      <>
        <AuthRedirectEffect />
        <MemoAppTree>{children}</MemoAppTree>
      </>
    );
  }

  return (
    <>
      <AuthRedirectEffect />
      {children}
    </>
  );
}
