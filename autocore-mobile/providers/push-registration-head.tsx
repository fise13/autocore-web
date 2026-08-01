import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useAuthStore } from '@/store/auth-store';
import { ensurePushDeviceRegistered } from '@/services/notifications/push-channel';

/** Registers Expo push token as soon as the user is signed in (not gated on Pro/subscription). */
export function PushRegistrationHead() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid ?? null);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const { preferences, loaded } = useNotificationPreferences();
  const pushEnabled = loaded ? preferences.channels.push : true;

  useEffect(() => {
    if (!uid || isHydrating) return;

    // First run after sign-in is where the iOS prompt is raised: notifications
    // are core to the product (work orders, shift, payouts), and nothing else
    // asks outside the notification settings screen.
    void ensurePushDeviceRegistered(pushEnabled, { promptIfUndetermined: true });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Resumes only re-register an existing grant — never re-prompt.
        void ensurePushDeviceRegistered(pushEnabled);
      }
    });

    return () => subscription.remove();
  }, [uid, isHydrating, pushEnabled]);

  return null;
}
