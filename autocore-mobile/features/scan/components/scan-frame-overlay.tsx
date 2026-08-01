import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { autocoreEase } from '@/theme/motion';

import { scanSpring } from '../animation/scan-timeline';
import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanFrameOverlayProps = {
  detected: boolean;
  width?: number;
  height?: number;
};

function CornerMark({ color, flipX, flipY }: { color: string; flipX?: boolean; flipY?: boolean }) {
  return (
    <Svg
      width={scanLayout.cornerLength}
      height={scanLayout.cornerLength}
      style={{ transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] }}
    >
      <Path
        d="M 2 18 L 2 2 L 18 2"
        stroke={color}
        strokeWidth={scanLayout.cornerStroke}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Thin Apple-style viewfinder — corners only, one detect flash. */
export function ScanFrameOverlay({
  detected,
  width = scanLayout.frameSize,
  height = scanLayout.frameSize,
}: ScanFrameOverlayProps) {
  const chrome = useScanChromeColors();
  const detect = useSharedValue(0);
  const frameW = useSharedValue(width);
  const frameH = useSharedValue(height);

  useEffect(() => {
    frameW.value = withSpring(width, scanSpring.detect);
    frameH.value = withSpring(height, scanSpring.detect);
  }, [frameH, frameW, height, width]);

  useEffect(() => {
    detect.value = detected
      ? withSpring(1, scanSpring.detect)
      : withTiming(0, { duration: 160, easing: autocoreEase });
  }, [detect, detected]);

  const frameStyle = useAnimatedStyle(() => ({
    width: frameW.value,
    height: frameH.value,
    transform: [{ scale: 1 + detect.value * 0.02 }],
  }));

  const cornerColor = detected ? chrome.frameDetected : chrome.frameIdle;

  return (
    <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'relative' }, frameStyle]}>
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
