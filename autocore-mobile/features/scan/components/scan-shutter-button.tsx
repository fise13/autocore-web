import { Pressable, View } from 'react-native';

import { haptics } from '@/theme';

import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanShutterButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Brand shutter for Document / VIN photo capture. */
export function ScanShutterButton({
  onPress,
  disabled,
  accessibilityLabel = 'Capture',
}: ScanShutterButtonProps) {
  const chrome = useScanChromeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptics.medium();
        onPress();
      }}
      style={{
        alignSelf: 'center',
        opacity: disabled ? 0.45 : 1,
        paddingVertical: 2,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: chrome.shutterRing,
          backgroundColor: 'transparent',
        }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: chrome.shutterFill,
          }}
        />
      </View>
    </Pressable>
  );
}
