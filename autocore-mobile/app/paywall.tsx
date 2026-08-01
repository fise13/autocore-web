import { useLocalSearchParams } from 'expo-router';

import { PaywallScreen } from '@/features/subscription';
import { FEATURE_MATRIX, type GatedFeature } from '@/lib/subscriptions/feature-gate';

function parseFeature(value: string | string[] | undefined): GatedFeature | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return raw in FEATURE_MATRIX ? (raw as GatedFeature) : undefined;
}

export default function PaywallRoute() {
  const params = useLocalSearchParams<{ feature?: string }>();
  return <PaywallScreen feature={parseFeature(params.feature)} />;
}
