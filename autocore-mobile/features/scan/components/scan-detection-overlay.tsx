import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { ScanDetection, ScanPhase } from '@/services/scan';

import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanDetectionOverlayProps = {
  detection: ScanDetection | null;
  phase: ScanPhase;
  layout: { width: number; height: number };
};

function normalizeBounds(
  detection: ScanDetection,
  layout: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const { bounds, cornerPoints } = detection;
  const pad = 10;

  if (cornerPoints?.length >= 4) {
    const xs = cornerPoints.map((p) => p.x);
    const ys = cornerPoints.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs) + pad;
    const maxY = Math.max(...ys) + pad;
    return {
      x: Math.max(0, minX),
      y: Math.max(0, minY),
      width: Math.min(layout.width, maxX - minX),
      height: Math.min(layout.height, maxY - minY),
    };
  }

  if (bounds?.size && bounds.size.width > 0 && bounds.size.height > 0) {
    const { origin, size } = bounds;
    return {
      x: Math.max(0, origin.x - pad),
      y: Math.max(0, origin.y - pad),
      width: Math.min(layout.width, size.width + pad * 2),
      height: Math.min(layout.height, size.height + pad * 2),
    };
  }

  const fallback = Math.min(layout.width, layout.height) * 0.42;
  return {
    x: (layout.width - fallback) / 2,
    y: (layout.height - fallback) / 2,
    width: fallback,
    height: fallback * 0.55,
  };
}

/** Quiet white highlight around the live detection — no neon glow. */
export function ScanDetectionOverlay({ detection, phase, layout }: ScanDetectionOverlayProps) {
  const chrome = useScanChromeColors();
  const visible = useSharedValue(0);
  const show =
    detection &&
    (phase === 'tracking' || phase === 'resolving' || phase === 'confirmed');

  useEffect(() => {
    visible.value = withTiming(show ? 1 : 0, {
      duration: show ? 180 : 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [show, visible]);

  const box = detection ? normalizeBounds(detection, layout) : null;
  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
  }));

  if (!box) return null;

  const radius = Math.min(12, box.width * 0.1, box.height * 0.18);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          borderRadius: radius,
          borderWidth: 2,
          borderColor: chrome.detectionBorder,
          backgroundColor: chrome.detectionFill,
        },
        style,
      ]}
    />
  );
}
