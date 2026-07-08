import { useMemo } from 'react';

import { canManageSettings } from '@/lib/permissions';
import { useCompanyAppConfig } from '@/hooks/use-company-app-config';
import { isCompleteFullName } from '@/lib/auth/profile-name';
import { resolveSessionCompanyId } from '@/lib/session/merge-hydration';
import { useAuthStore } from '@/store/auth-store';

export type AuthJourneyStep =
  | 'loading'
  | 'verify-email'
  | 'profile-name'
  | 'company'
  | 'setup-wizard'
  | 'app';

export const AUTH_JOURNEY_STEP_LABELS: Record<Exclude<AuthJourneyStep, 'loading' | 'app'>, string> = {
  'verify-email': 'Подтверждение email',
  'profile-name': 'Ваш профиль',
  company: 'Команда и доступ',
  'setup-wizard': 'Настройка пространства',
};

function isEmailPasswordUser(email: string | null | undefined, providerIds: string[]): boolean {
  if (providerIds.includes('password')) return true;
  return Boolean(email) && providerIds.length === 0;
}

function canRunSetupWizard(profile: NonNullable<ReturnType<typeof useAuthStore.getState>['profile']>): boolean {
  return profile.isCompanyOwner === true || canManageSettings(profile);
}

export function useAuthJourneyStep(localProfileName?: string | null): AuthJourneyStep {
  const status = useAuthStore((s) => s.status);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const cachedConfig = useAuthStore((s) => s.companyConfig);
  const isReady = status !== 'booting' && !isHydrating;
  const companyId = resolveSessionCompanyId(profile, memberships);
  const { config, loaded: configLoaded } = useCompanyAppConfig(companyId);

  return useMemo(() => {
    if (!isReady) return 'loading';
    if (!firebaseUser) return 'app';
    if (!profile) return 'loading';

    const providerIds = firebaseUser.providerData.map((entry) => entry.providerId);
    const emailVerified = firebaseUser.emailVerified;
    if (isEmailPasswordUser(firebaseUser.email, providerIds) && !emailVerified) {
      return 'verify-email';
    }

    const effectiveName = localProfileName ?? profile.displayName ?? null;
    if (!isCompleteFullName(effectiveName)) {
      return 'profile-name';
    }

    if (!companyId) {
      return 'company';
    }

    if (!canRunSetupWizard(profile)) {
      return 'app';
    }

    const effectiveConfig = config ?? cachedConfig;
    if (!configLoaded) {
      if (effectiveConfig?.onboardingCompleted) return 'app';
      return 'loading';
    }

    if (!effectiveConfig?.onboardingCompleted) {
      return 'setup-wizard';
    }

    return 'app';
  }, [
    cachedConfig,
    companyId,
    config,
    configLoaded,
    firebaseUser,
    isReady,
    localProfileName,
    profile,
  ]);
}

export function journeyPathForStep(step: AuthJourneyStep): string | null {
  if (step === 'verify-email') return '/(auth)/journey/verify-email';
  if (step === 'profile-name') return '/(auth)/journey/profile-name';
  if (step === 'company') return '/(auth)/journey/company';
  if (step === 'setup-wizard') return '/(auth)/journey/setup-wizard';
  return null;
}
