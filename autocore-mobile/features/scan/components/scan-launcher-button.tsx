import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ScanSearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { scanContextStore, type ScanOrderResult } from '@/services/scan';
import { haptics } from '@/theme';

type ScanLauncherButtonProps = {
  orderId?: string;
  orderLabel?: string;
  label?: string;
  compact?: boolean;
  onScanResult?: (result: ScanOrderResult) => void;
};

export function ScanLauncherButton({
  orderId,
  orderLabel,
  label,
  compact,
  onScanResult,
}: ScanLauncherButtonProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const isOrderFlow = onScanResult != null;
  const buttonLabel = label ?? (isOrderFlow ? 'Сканировать запчасть' : 'Сканировать');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={buttonLabel}
      onPress={() => {
        haptics.light();
        scanContextStore.begin({
          mode: 'order',
          orderId,
          orderLabel,
          onComplete: onScanResult,
        });
        router.push(
          (isOrderFlow ? '/(tabs)/orders/scan' : '/(tabs)/scan') as Href,
        );
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
        {buttonLabel}
      </Text>
    </Pressable>
  );
}

export function ScanLauncherRow({
  orderId,
  orderLabel,
  onScanResult,
}: {
  orderId?: string;
  orderLabel?: string;
  onScanResult?: (result: ScanOrderResult) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 8, alignItems: 'flex-end' }}>
      <Text variant="caption" style={{ color: colors.mutedForeground, textAlign: 'right' }}>
        Штрихкод добавит позицию в этот заказ-наряд
      </Text>
      <ScanLauncherButton
        orderId={orderId}
        orderLabel={orderLabel}
        onScanResult={onScanResult}
        compact
      />
    </View>
  );
}
