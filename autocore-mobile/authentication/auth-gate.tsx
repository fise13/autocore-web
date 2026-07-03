import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuth } from '@/authentication/auth-provider';
import { AuthLoadingScreen } from '@/authentication/auth-loading-screen';
import { journeyPathForStep, useAuthJourneyStep } from '@/hooks/use-auth-journey-step';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, isReady, hasAccess } = useAuth();
  const journeyStep = useAuthJourneyStep();

  useEffect(() => {
    if (!isReady) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inTabs = root === '(tabs)';
    const inJourney = inAuthGroup && segments[1] === 'journey';
    const onLogin = inAuthGroup && segments[1] === 'login';
    const onForgot = inAuthGroup && segments[1] === 'forgot-password';

    if (!firebaseUser) {
      if (!onLogin && !onForgot) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (journeyStep !== 'app') {
      const target = journeyPathForStep(journeyStep);
      if (target && (!inJourney || segments[2] !== journeyStep)) {
        router.replace(target as never);
      }
      return;
    }

    if (hasAccess && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [firebaseUser, hasAccess, isReady, journeyStep, router, segments]);

  if (!isReady) {
    return <AuthLoadingScreen message="Загрузка…" />;
  }

  if (firebaseUser && journeyStep === 'loading') {
    return <AuthLoadingScreen message="Подготовка рабочего пространства…" />;
  }

  return children;
}
