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
 */
export function HandoffHead() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    const parsed = JSON.parse(paramKey) as Record<string, unknown>;
    const href = expoPathToCanonicalHttps(pathname, parsed);
    setHandoffWebpageUrl(href);
    return () => setHandoffWebpageUrl(null);
  }, [pathname, paramKey]);

  return null;
}
