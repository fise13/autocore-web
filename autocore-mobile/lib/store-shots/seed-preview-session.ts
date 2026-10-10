import type { User } from 'firebase/auth';

import { PERMISSIONS } from '@autocore/rbac';

import { queryClient } from '@/lib/query-client';
import { makePreviewMotors } from '@/lib/store-shots/preview-motors';
import { setPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';
import { useAuthStore } from '@/store/auth-store';

const COMPANY_ID = 'store-shots-company';

/** Fake Firebase user — enough for session uid + journey checks. */
function previewFirebaseUser(): User {
  return {
    uid: 'store-shots-user',
    email: 'owner@myautocore.com',
    emailVerified: true,
    displayName: 'Victor Petrov',
    providerData: [{ providerId: 'google.com', uid: 'store-shots-user' }],
  } as User;
}

/**
 * Session for App Store captures. Skips AuthProvider so Firebase cannot
 * overwrite it mid-screenshot.
 */
export function seedPreviewSession(): void {
  setPaywallBypassed(true);
  useAuthStore.setState({
    status: 'authenticated',
    isHydrating: false,
    isOnline: true,
    error: null,
    firebaseUser: previewFirebaseUser(),
    workspaceBlock: null,
    activeCompanyName: 'North Yard Motors',
    memberships: [
      {
        companyId: COMPANY_ID,
        role: 'owner',
        name: 'North Yard Motors',
      },
    ],
    companyConfig: {
      onboardingCompleted: true,
      modules: {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      },
      specificCategories: [],
      defaultWarrantyTemplate: '',
    },
    profile: {
      id: 'store-shots-user',
      email: 'owner@myautocore.com',
      displayName: 'Victor Petrov',
      role: 'owner',
      companyId: COMPANY_ID,
      isActive: true,
      isCompanyOwner: true,
      permissions: [...PERMISSIONS],
    },
  });

  const motorCount = Number(process.env.EXPO_PUBLIC_STORE_SHOTS_MOTORS ?? 0);
  if (motorCount > 0) {
    const key = ['realtime', 'motors', COMPANY_ID, 'store-shots-user'];
    if (!queryClient.getQueryData(key)) {
      queryClient.setQueryData(key, makePreviewMotors(motorCount, COMPANY_ID));
    }
  }
}
