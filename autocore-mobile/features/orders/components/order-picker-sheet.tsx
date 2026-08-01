import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import type { WorkOrder } from '@/types/work-order';

type OrderPickerSheetProps = {
  drafts: WorkOrder[];
  onSelectNew: () => void;
  onSelectOrder: (orderId: string) => void;
  onDismiss?: () => void;
};

function OrderPickerRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 2,
      }}
    >
      <Text variant="bodyStrong">{title}</Text>
      {subtitle ? (
        <Text variant="caption" color="muted">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const OrderPickerSheet = forwardRef<BottomSheetModal, OrderPickerSheetProps>(
  function OrderPickerSheet({ drafts, onSelectNew, onSelectOrder, onDismiss }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet({ backdropOpacity: 0.35 });

    return (
      <BottomSheetModal
        ref={ref}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.compactSnapPoints(42)}
        enablePanDownToClose
        backdropComponent={sheet.renderBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetScrollView contentContainerStyle={{ ...sheet.compactContentStyle, gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
            Add to work order
          </Text>
          <OrderPickerRow title="New work order" subtitle="Create a draft" onPress={onSelectNew} />
          {drafts.map((order) => (
            <OrderPickerRow
              key={order.id}
              title={`#${order.number}`}
              subtitle={[order.clientName, order.vehicleLabel].filter(Boolean).join(' · ') || 'Draft'}
              onPress={() => onSelectOrder(order.id)}
            />
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
