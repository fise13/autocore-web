import { View } from 'react-native';

import type { ScanPhase } from '@/services/scan';

type ScanIdleIndicatorProps = {
  phase: ScanPhase;
};

/** Reserved hook for ambient idle motion — kept quiet (Apple Camera). */
export function ScanIdleIndicator(_props: ScanIdleIndicatorProps) {
  return <View pointerEvents="none" />;
}
