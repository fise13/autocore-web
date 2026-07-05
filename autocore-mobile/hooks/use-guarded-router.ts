import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { guardedPush } from '@/lib/navigation/guarded-push';

/** Expo Router with duplicate-safe `push` for nested stack screens. */
export function useGuardedRouter() {
  const router = useRouter();
  const push = useCallback((href: Href) => guardedPush(router, href), [router]);

  return useMemo(
    () => ({
      ...router,
      push,
    }),
    [router, push],
  );
}
