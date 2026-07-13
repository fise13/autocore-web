import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import type { ScanDetection, ScanPhase } from '@/services/scan';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const LENS_BLUE = '#4DA3FF';
const LENS_GLOW = 'rgba(77, 163, 255, 0.55)';

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
  const pad = 14;

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

export function ScanDetectionOverlay({ detection, phase, layout }: ScanDetectionOverlayProps) {
  const reduced = useReducedMotion();
  const visible = useSharedValue(0);
  const breathe = useSharedValue(0);
  const pulse = useSharedValue(0);

  const show =
    detection &&
    (phase === 'tracking' || phase === 'resolving' || phase === 'confirmed');

  useEffect(() => {
    if (!show) {
      visible.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      return;
    }
    visible.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    if (reduced) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0.35, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breathe, pulse, reduced, show, visible]);

  const box = detection ? normalizeBounds(detection, layout) : null;

  const glowStyle = useAnimatedStyle(() => ({
    opacity: visible.value * (0.42 + breathe.value * 0.22),
    transform: [{ scale: 1 + breathe.value * 0.04 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: visible.value * (0.72 + pulse.value * 0.2),
    transform: [{ scale: 1 + breathe.value * 0.018 }],
  }));

  const animatedGlowProps = useAnimatedProps(() => ({
    strokeOpacity: 0.25 + breathe.value * 0.35,
  }));

  if (!box) return null;

  const radius = Math.min(18, box.width * 0.12, box.height * 0.2);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: box.x, top: box.y }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: -10,
            top: -10,
            width: box.width + 20,
            height: box.height + 20,
            borderRadius: radius + 8,
            backgroundColor: LENS_GLOW,
            shadowColor: LENS_BLUE,
            shadowOpacity: 0.65,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          },
          glowStyle,
        ]}
      />
      <Animated.View style={[{ width: box.width, height: box.height }, ringStyle]}>
        <Svg width={box.width} height={box.height}>
          <Defs>
            <LinearGradient id="lensStroke" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#7EC8FF" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#2B7FE0" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <AnimatedRect
            x={1}
            y={1}
            width={box.width - 2}
            height={box.height - 2}
            rx={radius}
            ry={radius}
            stroke="url(#lensStroke)"
            strokeWidth={2.5}
            fill="rgba(77, 163, 255, 0.08)"
            animatedProps={animatedGlowProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
