import { useCallback, useMemo } from 'react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { usePaywall } from '@/hooks/use-paywall';
import { useSession } from '@/hooks/use-session';
import {
  evaluateGate,
  featureRule,
  FeatureLockedError,
  type FeatureRule,
  type GatedFeature,
} from '@/lib/subscriptions/feature-gate';
import type { GateResult } from '@/lib/subscriptions/types';

export type UseFeatureGateResult = GateResult & {
  rule: FeatureRule;
  isLoading: boolean;
  /** Open the paywall, pre-seeded with this feature. */
  presentPaywall: () => void;
  /**
   * Run `action` only when the gate allows it; otherwise present the paywall.
   * The single call site pattern for "premium button" handlers.
   */
  guard: (action: () => void) => () => void;
};

/**
 * The one way to check a premium feature.
 *
 * Combines RBAC and entitlement, and carries the denial reason so callers can
 * show a paywall, an "ask your administrator" note, or a module-settings link
 * — never one generic wall for all three.
 */
export function useFeatureGate(feature: GatedFeature): UseFeatureGateResult {
  const { can } = useSession();
  const { entitlement, isLoading } = useEntitlement();
  const { present } = usePaywall();

  const result = useMemo(
    () => evaluateGate({ feature, tier: entitlement.tier, can }),
    [can, entitlement.tier, feature],
  );

  const presentPaywall = useCallback(() => present(feature), [feature, present]);

  const guard = useCallback(
    (action: () => void) => () => {
      if (result.allowed) {
        action();
        return;
      }
      // Only an entitlement gap is solvable by buying something.
      if (result.reason === 'entitlement_required') presentPaywall();
    },
    [presentPaywall, result.allowed, result.reason],
  );

  return {
    ...result,
    rule: featureRule(feature),
    isLoading,
    presentPaywall,
    guard,
  };
}

/** Imperative guard for event handlers outside the render path. */
export function assertFeature(result: GateResult, feature: GatedFeature): void {
  if (!result.allowed) throw new FeatureLockedError(feature, result.reason);
}
