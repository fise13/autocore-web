import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { haptics } from '@/theme';
import type { GatedFeature } from '@/lib/subscriptions/feature-gate';

export type PresentPaywall = (feature?: GatedFeature) => void;

/**
 * Imperative paywall presentation.
 *
 * One entry point for every upsell so the modal is always presented the same
 * way; `feature` seeds the headline with the thing the user just reached for.
 */
export function usePaywall(): { present: PresentPaywall; dismiss: () => void } {
  const router = useRouter();

  const present = useCallback<PresentPaywall>(
    (feature) => {
      haptics.light();
      router.push({
        pathname: '/paywall',
        params: feature ? { feature } : {},
      });
    },
    [router],
  );

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  return { present, dismiss };
}
