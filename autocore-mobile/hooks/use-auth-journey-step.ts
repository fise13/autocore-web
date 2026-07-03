import { useMemo } from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { isCompleteFullName } from '@/lib/auth/profile-name';
import { isProductionCompanyId } from '@/lib/company-id';

export type AuthJourneyStep =
  | 'loading'
  | 'verify-email'
  | 'profile-name'
  | 'company'
  | 'app';

export const AUTH_JOURNEY_STEP_LABELS: Record<Exclude<AuthJourneyStep, 'loading' | 'app'>, string> = {
  'verify-email': 'Подтверждение email',
  'profile-name': 'Ваш профиль',
  company: 'Команда и доступ',
};

function isEmailPasswordUser(email: string | null | undefined, providerIds: string[]): boolean {
  if (providerIds.includes('password')) return true;
  return Boolean(email) && providerIds.length === 0;
}

export function useAuthJourneyStep(localProfileName?: string | null): AuthJourneyStep {
  const { firebaseUser, profile, isReady } = useAuth();
  const companyId = profile?.companyId?.trim() || null;

  return useMemo(() => {
    if (!isReady) return 'loading';
    if (!firebaseUser) return 'app';
    if (!profile) return 'company';

    const providerIds = firebaseUser.providerData.map((entry) => entry.providerId);
    const emailVerified = firebaseUser.emailVerified;
    if (isEmailPasswordUser(firebaseUser.email, providerIds) && !emailVerified) {
      return 'verify-email';
    }

    const effectiveName = localProfileName ?? profile.displayName ?? null;
    if (!isCompleteFullName(effectiveName)) {
      return 'profile-name';
    }

    if (!isProductionCompanyId(companyId)) {
      return 'company';
    }

    return 'app';
  }, [companyId, firebaseUser, isReady, localProfileName, profile]);
}

export function journeyPathForStep(step: AuthJourneyStep): string | null {
  if (step === 'verify-email') return '/(auth)/journey/verify-email';
  if (step === 'profile-name') return '/(auth)/journey/profile-name';
  if (step === 'company') return '/(auth)/journey/company';
  return null;
}
