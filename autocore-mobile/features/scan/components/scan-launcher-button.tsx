import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
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
  const router = useRouter();
  const isOrderFlow = onScanResult != null;
  const buttonLabel = label ?? (isOrderFlow ? 'Scan Part' : 'Scan');

  return (
    <Button
      native={false}
      variant="secondary"
      size={compact ? 'sm' : 'default'}
      accessibilityLabel={buttonLabel}
      inline
      onPress={() => {
        haptics.light();
        scanContextStore.begin({
          mode: 'order',
          orderId,
          orderLabel,
          onComplete: onScanResult,
        });
        router.push((isOrderFlow ? '/(tabs)/orders/scan' : '/(tabs)/scan') as Href);
      }}
    >
      {buttonLabel}
    </Button>
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
        Scanning a barcode adds a line item to this work order
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
