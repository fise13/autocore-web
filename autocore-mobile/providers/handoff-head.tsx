import { useEffect } from 'react';
import { useGlobalSearchParams, usePathname } from 'expo-router';

import { setHandoffWebpageUrl } from '@/lib/deep-links/apple-handoff';
import { expoPathToCanonicalHttps } from '@/lib/deep-links/handoff-canonical';

/**
 * Keeps the current Handoff activity aligned with the screen the user is on.
 *
 * Mounted for the whole app (including invite/join). Login and other screens
 * without a claimed web URL clear the activity so the Mac Dock does not offer
 * a dead continue-target.
 *
 * Do not invalidate on effect cleanup: Expo Router updates search params
 * while typing in a create-order form, and resigning the activity each time
 * prevents Continuity from ever appearing in the Mac Dock.
 */
export function HandoffHead() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const href = expoPathToCanonicalHttps(pathname, params as Record<string, unknown>);

  useEffect(() => {
    setHandoffWebpageUrl(href);
  }, [href]);

  return null;
}
