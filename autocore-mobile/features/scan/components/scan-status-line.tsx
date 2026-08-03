import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration } from '@/theme';
import type { ScanPhase } from '@/services/scan';

import type { ScanCaptureMode } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanStatusLineProps = {
  phase: ScanPhase;
  mode: ScanCaptureMode;
  ocrBusy?: boolean;
  detectedPayload?: string | null;
  relocateHint?: string | null;
  orderHint?: string | null;
};

export function scanStatusCopy(props: ScanStatusLineProps): string {
  if (props.ocrBusy) {
    return props.mode === 'document' ? 'Uploading…' : 'Recognizing…';
  }
  if (props.relocateHint) return props.relocateHint;
  if (props.orderHint) return props.orderHint;
  if (props.phase === 'resolving') return 'Hold steady';
  if (props.phase === 'tracking' && props.detectedPayload) {
    return props.detectedPayload.length > 28
      ? `${props.detectedPayload.slice(0, 28)}…`
      : props.detectedPayload;
  }
  if (props.phase === 'tracking') return 'Hold steady';
  if (props.phase === 'confirmed') return 'Found';
  if (props.phase === 'paused') return 'Paused';

  switch (props.mode) {
    case 'vin':
      return 'Point at the VIN plate';
    case 'document':
      return 'Fill the frame, then tap the shutter';
    default:
      return 'Ready';
  }
}

/** Status caption under the viewfinder. */
export function ScanStatusLine(props: ScanStatusLineProps) {
  const chrome = useScanChromeColors();
  const reducedMotion = useReducedMotion();
  const label = scanStatusCopy(props);
  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.fast).easing(autocoreEase);
  const exiting = reducedMotion
    ? undefined
    : FadeOut.duration(duration.instant);

  return (
    <Animated.View
      key={label}
      entering={entering}
      exiting={exiting}
      style={{ alignItems: 'center', paddingHorizontal: 24, minHeight: 22 }}
    >
      <Text
        variant="caption"
        style={{
          color: chrome.status,
          fontSize: 15,
          fontWeight: '500',
          letterSpacing: -0.1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}
