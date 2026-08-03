import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, FlashlightIcon } from '@/assets/icons';
import { IconButton } from '@/components/ui';
import { haptics } from '@/theme';

import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanTopBarProps = {
  torchOn: boolean;
  onToggleTorch: () => void;
  onBackPress?: () => void;
};

/** Top chrome: optional back, torch on the right — shared Button/IconButton language. */
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
        <IconButton
          size="lg"
          variant={Platform.OS === 'ios' ? 'ghost' : 'secondary'}
          systemImage="chevron.left"
          accessibilityLabel="Back"
          onPress={() => {
            haptics.light();
            onBackPress();
          }}
          style={
            Platform.OS === 'ios'
              ? undefined
              : {
                  backgroundColor: chrome.controlIdleBg,
                  borderWidth: 1,
                  borderColor: chrome.controlIdleBorder,
                  borderRadius: scanLayout.controlRadius,
                }
          }
        >
          <ArrowLeftIcon size="sm" color={chrome.controlIcon} strokeWidth={2} />
        </IconButton>
      ) : (
        <View style={{ width: scanLayout.controlSize }} />
      )}

      <IconButton
        size="lg"
        variant={torchOn ? 'default' : Platform.OS === 'ios' ? 'ghost' : 'secondary'}
        systemImage={torchOn ? 'flashlight.on.fill' : 'flashlight.off.fill'}
        accessibilityLabel="Flashlight"
        onPress={() => {
          haptics.selection();
          onToggleTorch();
        }}
        style={
          Platform.OS === 'ios'
            ? undefined
            : {
                backgroundColor: torchOn ? chrome.controlActiveBg : chrome.controlIdleBg,
                borderWidth: 1,
                borderColor: torchOn ? chrome.controlActiveBorder : chrome.controlIdleBorder,
                borderRadius: scanLayout.controlRadius,
              }
        }
      >
        <FlashlightIcon
          size="sm"
          color={torchOn ? chrome.controlIconActive : chrome.controlIcon}
          strokeWidth={1.85}
        />
      </IconButton>
    </View>
  );
}
