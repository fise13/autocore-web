import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useAuthStore } from '@/store/auth-store';
import { ensurePushDeviceRegistered } from '@/services/notifications/push-channel';

/** Registers Expo push token as soon as the user is signed in (not gated on Pro/subscription). */
export function PushRegistrationHead() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid ?? null);
  const { preferences, loaded } = useNotificationPreferences();
  const pushEnabled = loaded ? preferences.channels.push : true;

  useEffect(() => {
    if (!uid) return;

    void ensurePushDeviceRegistered(pushEnabled);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void ensurePushDeviceRegistered(pushEnabled);
      }
    });

    return () => subscription.remove();
  }, [uid, pushEnabled]);

  return null;
}
