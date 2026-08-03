import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { haptics, spring } from '@/theme';

import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanShutterButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Camera-style shutter for VIN / Document — white disc in a bright ring,
 * press scale, no SwiftUI Host (reliable first tap).
 */
export function ScanShutterButton({
  onPress,
  disabled,
  accessibilityLabel = 'Capture',
}: ScanShutterButtonProps) {
  const chrome = useScanChromeColors();
  const reduced = useReducedMotion();
  const press = useSharedValue(0);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.12 }],
    opacity: 1 - press.value * 0.08,
  }));

  const fire = () => {
    if (disabled) return;
    haptics.medium();
    onPress();
  };

  return (
    <View style={{ alignSelf: 'center', paddingVertical: 4, opacity: disabled ? 0.4 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        hitSlop={8}
        onPressIn={() => {
          if (disabled || reduced) return;
          press.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, spring.press);
        }}
        onPress={fire}
        style={{
          width: 78,
          height: 78,
          borderRadius: 39,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3.5,
          borderColor: chrome.shutterRing,
          backgroundColor: 'transparent',
        }}
      >
        <Animated.View
          style={[
            {
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: chrome.shutterFill,
            },
            discStyle,
          ]}
        />
      </Pressable>
    </View>
  );
}
