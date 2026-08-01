import { FeatureGate } from '@/components/subscription/feature-gate';

type TeamProGateProps = {
  children: React.ReactNode;
};

/**
 * Thin alias over the shared gate.
 *
 * The hand-rolled Pro check that used to live here — including its "open the
 * website" button — is now one row in `FEATURE_MATRIX`, so team access, its
 * paywall copy and its RBAC requirement are declared in the same place as every
 * other premium feature.
 */
export function TeamProGate({ children }: TeamProGateProps) {
  return <FeatureGate feature="team_management">{children}</FeatureGate>;
}
