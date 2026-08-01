import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, FlashlightIcon } from '@/assets/icons';
import { haptics } from '@/theme';

import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanTopBarProps = {
  torchOn: boolean;
  onToggleTorch: () => void;
  onBackPress?: () => void;
};

function CircleControl({
  accessibilityLabel,
  active,
  onPress,
  children,
}: {
  accessibilityLabel: string;
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const chrome = useScanChromeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: scanLayout.controlSize,
        height: scanLayout.controlSize,
        borderRadius: scanLayout.controlRadius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? chrome.controlActiveBg : chrome.controlIdleBg,
        borderWidth: 1,
        borderColor: active ? chrome.controlActiveBorder : chrome.controlIdleBorder,
      }}
    >
      {children}
    </Pressable>
  );
}

/** Top chrome: optional back, torch on the right — brand colors. */
export function ScanTopBar({ torchOn, onToggleTorch, onBackPress }: ScanTopBarProps) {
  const chrome = useScanChromeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 4,
        paddingTop: insets.top + 8,
        paddingHorizontal: scanLayout.pad,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {onBackPress ? (
        <CircleControl
          accessibilityLabel="Back"
          onPress={() => {
            haptics.light();
            onBackPress();
          }}
        >
          <ArrowLeftIcon size="sm" color={chrome.controlIcon} strokeWidth={2} />
        </CircleControl>
      ) : (
        <View style={{ width: scanLayout.controlSize }} />
      )}

      <CircleControl
        accessibilityLabel="Flashlight"
        active={torchOn}
        onPress={() => {
          haptics.selection();
          onToggleTorch();
        }}
      >
        <FlashlightIcon
          size="sm"
          color={torchOn ? chrome.controlIconActive : chrome.controlIcon}
          strokeWidth={1.85}
        />
      </CircleControl>
    </View>
  );
}
