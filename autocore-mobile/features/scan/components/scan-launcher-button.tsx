import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ScanSearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { scanContextStore, type ScanOrderResult } from '@/services/scan';
import { haptics } from '@/theme';

type ScanLauncherButtonProps = {
  orderId?: string;
  label?: string;
  compact?: boolean;
  onScanResult?: (result: ScanOrderResult) => void;
};

export function ScanLauncherButton({
  orderId,
  label = 'Сканировать',
  compact,
  onScanResult,
}: ScanLauncherButtonProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        scanContextStore.begin({
          mode: 'order',
          orderId,
          onComplete: onScanResult,
        });
        router.push('/(tabs)/scan' as Href);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: compact ? 40 : 44,
        paddingHorizontal: compact ? 12 : 14,
        borderRadius: 12,
        backgroundColor: `${colors.primary}14`,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
      }}
    >
      <ScanSearchIcon size="sm" color={colors.primary} strokeWidth={1.85} />
      <Text variant="caption" style={{ fontWeight: '700', color: colors.primary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ScanLauncherRow({
  orderId,
  onScanResult,
}: {
  orderId?: string;
  onScanResult?: (result: ScanOrderResult) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <ScanLauncherButton orderId={orderId} onScanResult={onScanResult} compact />
    </View>
  );
}
