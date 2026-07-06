import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { useCompanySubscription } from '@/hooks/use-company-subscription';
import { journeyPathForStep, useAuthJourneyStep } from '@/hooks/use-auth-journey-step';
import { isProductionCompanyId } from '@/lib/company-id';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';

/**
 * Headless auth routing — owns segment subscriptions so AuthGate UI
 * does not re-render on every tab switch.
 */
export function AuthRedirectEffect() {
  const router = useRouter();
  const segments = useSegments();
  const lastRedirectRef = useRef<string | null>(null);

  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);

  const isReady = status !== 'booting' && !isHydrating;
  const companyId = resolveSessionCompanyId(profile, memberships);
  const hasAccess =
    status === 'authenticated' &&
    profile?.isActive !== false &&
    isProductionCompanyId(companyId);

  const journeyStep = useAuthJourneyStep();
  const { isPro, isLoading: subscriptionLoading } = useCompanySubscription(companyId);

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

    if (hasAccess && (isPro || subscriptionLoading) && !inTabs) {
      redirect('/(tabs)');
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
  ]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [segments]);

  return null;
}
