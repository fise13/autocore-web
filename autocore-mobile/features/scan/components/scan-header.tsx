import { View } from 'react-native';

import { FlashlightIcon, SettingsIcon } from '@/assets/icons';
import { IconButton, PageHeader } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

type ScanHeaderProps = {
  torchOn: boolean;
  onToggleTorch: () => void;
  onSettingsPress: () => void;
};

export function ScanHeader({ torchOn, onToggleTorch, onSettingsPress }: ScanHeaderProps) {
  const { colors } = useTheme();

  return (
    <PageHeader
      title="Scan"
      subtitle="QR • VIN • Barcode • Document"
      inverted
      overlay
      trailing={
        <View style={{ alignItems: 'flex-end', gap: rhythm.micro }}>
          <View
            style={{
              borderRadius: rhythm.radius,
              overflow: 'hidden',
              backgroundColor: 'rgba(0,0,0,0.28)',
            }}
          >
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
              borderRadius: rhythm.radius,
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
      }
    />
  );
}
