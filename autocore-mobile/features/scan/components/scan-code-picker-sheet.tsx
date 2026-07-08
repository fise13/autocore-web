import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { formatScanPayloadPreview, symbologyLabel } from '@/lib/scan/symbology-label';
import { haptics } from '@/theme';
import type { ScanDetection } from '@/services/scan';

type ScanCodePickerSheetProps = {
  detections: ScanDetection[];
  onPick: (detection: ScanDetection) => void;
  onDismiss: () => void;
};

export const ScanCodePickerSheet = forwardRef<BottomSheetModal, ScanCodePickerSheetProps>(
  function ScanCodePickerSheet({ detections, onPick, onDismiss }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();

    return (
      <BottomSheetModal
        ref={ref}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.compactSnapPoints(Math.min(58, 34 + detections.length * 10))}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={sheet.renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetScrollView contentContainerStyle={{ ...sheet.compactContentStyle, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
              Несколько кодов в кадре
            </Text>
            <Text variant="caption" color="muted">
              Выберите, какой код обработать
            </Text>
          </View>

          {detections.map((detection) => (
            <Pressable
              key={`${detection.symbology}:${detection.payload}`}
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                onPick(detection);
              }}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.secondary,
                padding: 14,
                gap: 6,
              }}
            >
              <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
                {symbologyLabel(detection.symbology)}
              </Text>
              <Text variant="body" style={{ fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                {formatScanPayloadPreview(detection.payload)}
              </Text>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
