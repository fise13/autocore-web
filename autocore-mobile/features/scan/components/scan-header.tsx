import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashlightIcon, SettingsIcon } from '@/assets/icons';
import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { useScanEnter } from '../animation/use-scan-enter';
import { scanTimeline } from '../animation/scan-timeline';
import { scanLayout } from '../layout';

const appIcon = require('../../../assets/branding/login-logo.png');

type ScanHeaderProps = {
  torchOn: boolean;
  onToggleTorch: () => void;
  onSettingsPress: () => void;
};

export function ScanHeader({ torchOn, onToggleTorch, onSettingsPress }: ScanHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const enterStyle = useScanEnter({ delay: scanTimeline.header, translateY: -8, duration: 280 });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 8,
          paddingHorizontal: scanLayout.pad,
          paddingBottom: 12,
        },
        enterStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ width: 72 }} />
        <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
          <Image
            source={appIcon}
            style={{ width: scanLayout.headerLogo, height: scanLayout.headerLogo }}
            resizeMode="contain"
            accessibilityLabel="AutoCore"
          />
          <Text variant="heading" style={{ fontSize: scanLayout.title, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
            Scan
          </Text>
          <Text variant="caption" style={{ fontSize: scanLayout.subtitle, color: 'rgba(255,255,255,0.62)' }}>
            QR • VIN • Barcode • Document
          </Text>
        </View>
        <View style={{ width: 72, alignItems: 'flex-end', gap: 4 }}>
          <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.28)' }}>
            <IconButton
              accessibilityLabel="Настройки"
              variant="ghost"
              size="sm"
              onPress={() => {
                haptics.light();
                onSettingsPress();
              }}
            >
              <SettingsIcon size="sm" color="#fff" strokeWidth={1.75} />
            </IconButton>
          </View>
          <View
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: torchOn ? `${colors.primary}44` : 'rgba(0,0,0,0.28)',
            }}
          >
            <IconButton
              accessibilityLabel="Вспышка"
              variant="ghost"
              size="sm"
              onPress={() => {
                haptics.selection();
                onToggleTorch();
              }}
            >
              <FlashlightIcon size="sm" color={torchOn ? colors.primary : '#fff'} strokeWidth={1.85} />
            </IconButton>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
