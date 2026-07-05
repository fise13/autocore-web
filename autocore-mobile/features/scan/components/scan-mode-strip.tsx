import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

export type ScanCaptureMode = 'auto' | 'vin' | 'document';

type ScanModeStripProps = {
  mode: ScanCaptureMode;
  onChange: (mode: ScanCaptureMode) => void;
};

const MODES: Array<{ id: ScanCaptureMode; label: string }> = [
  { id: 'auto', label: 'Авто' },
  { id: 'vin', label: 'VIN' },
  { id: 'document', label: 'Документ' },
];

export function ScanModeStrip({ mode, onChange }: ScanModeStripProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        gap: rhythm.micro,
        padding: rhythm.micro,
        borderRadius: rhythm.radius,
        backgroundColor: 'rgba(0,0,0,0.42)',
      }}
    >
      {MODES.map((item) => {
        const active = item.id === mode;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(item.id);
            }}
            style={{
              minHeight: 34,
              minWidth: 72,
              paddingHorizontal: rhythm.inline,
              borderRadius: rhythm.radius - 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color: active ? colors.primaryForeground : 'rgba(255,255,255,0.82)',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function scanModeHint(mode: ScanCaptureMode): string {
  switch (mode) {
    case 'vin':
      return 'Наведите на VIN-табличку';
    case 'document':
      return 'Счёт, накладная, чек или заказ-наряд';
    default:
      return 'QR · штрихкод · VIN';
  }
}
