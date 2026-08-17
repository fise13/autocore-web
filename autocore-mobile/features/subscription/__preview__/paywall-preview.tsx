/**
 * TEMPORARY preview harness — delete when the paywall review is done.
 *
 * Mounts the real `PaywallScreen` without going through sign-in, so the
 * rendered result can be inspected in the simulator. It seeds the auth store
 * with an owner profile (only an owner may buy) and forces the `free` dev
 * scenario so the purchase path is the one on screen.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PaywallScreen } from '@/features/subscription/paywall-screen';
import { hideNativeSplashOnce } from '@/lib/splash';
import { setDevScenario } from '@/lib/subscriptions/dev-mode';
import { useAuthStore } from '@/store/auth-store';

/** Nudges the whole screen up so lower blocks can be screenshotted. */
const PREVIEW_SHIFT = 0;

export function PaywallPreview() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDevScenario('free');
    useAuthStore.setState({
      status: 'authenticated',
      profile: {
        id: 'preview-user',
        email: 'owner@example.com',
        displayName: 'Preview Owner',
        role: 'owner',
        companyId: 'preview-company',
        isActive: true,
        isCompanyOwner: true,
        permissions: [],
      },
      memberships: [],
      activeCompanyName: 'Preview Workshop',
      isOnline: true,
      isHydrating: false,
    });
    setReady(true);
    hideNativeSplashOnce();
  }, []);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, marginTop: -PREVIEW_SHIFT }}>
      <PaywallScreen />
    </View>
  );
}
