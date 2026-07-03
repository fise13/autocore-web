import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import { scanSpring } from '../animation/scan-timeline';
import { scanLayout } from '../layout';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type ScanFrameOverlayProps = {
  detected: boolean;
  onDetectComplete?: () => void;
};

function CornerMark({ color, flipX, flipY }: { color: string; flipX?: boolean; flipY?: boolean }) {
  return (
    <Svg width={22} height={22} style={{ transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] }}>
      <Path d="M 2 16 L 2 2 L 16 2" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function ScanFrameOverlay({ detected, onDetectComplete }: ScanFrameOverlayProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const detect = useSharedValue(0);
  const breathe = useSharedValue(0);
  const size = scanLayout.frameSize;

  useEffect(() => {
    if (!detected) {
      detect.value = withTiming(0, { duration: 160, easing: autocoreEase });
      return;
    }
    detect.value = withSpring(1, scanSpring.detect);
    const timer = setTimeout(() => onDetectComplete?.(), 180);
    return () => clearTimeout(timer);
  }, [detect, detected, onDetectComplete]);

  useEffect(() => {
    if (reduced) return;
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: autocoreEase }), -1, true);
  }, [breathe, reduced]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + detect.value * 0.025 + breathe.value * 0.008 }],
    opacity: 0.78 + detect.value * 0.22,
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeOpacity: 0.28 + detect.value * 0.62,
  }));

  const idleStroke = 'rgba(255,255,255,0.34)';
  const cornerColor = detected ? colors.primary : 'rgba(255,255,255,0.78)';

  return (
    <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: size, height: size }, frameStyle]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <AnimatedPath
            d={`M ${scanLayout.frameRadius} 1 H ${size - scanLayout.frameRadius} Q ${size - 1} 1 ${size - 1} ${scanLayout.frameRadius} V ${size - scanLayout.frameRadius} Q ${size - 1} ${size - 1} ${size - scanLayout.frameRadius} ${size - 1} H ${scanLayout.frameRadius} Q 1 ${size - 1} 1 ${size - scanLayout.frameRadius} V ${scanLayout.frameRadius} Q 1 1 ${scanLayout.frameRadius} 1`}
            stroke={detected ? colors.primary : idleStroke}
            strokeWidth={detected ? 2.5 : 1.5}
            fill="none"
            animatedProps={ringProps}
          />
        </Svg>
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          <CornerMark color={cornerColor} />
        </View>
        <View style={{ position: 'absolute', right: 0, top: 0 }}>
          <CornerMark color={cornerColor} flipX />
        </View>
        <View style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <CornerMark color={cornerColor} flipX flipY />
        </View>
        <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <CornerMark color={cornerColor} flipY />
        </View>
      </Animated.View>
    </View>
  );
}
