import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet } from '@/hooks';
import { formatScanPayloadPreview, symbologyLabel } from '@/lib/scan/symbology-label';
import { haptics } from '@/theme';
import type { ScanDetection } from '@/services/scan';

import { scanSheetAnimationConfigs } from '../animation/scan-sheet-motion';
import { scanLayout } from '../layout';
import {
  ScanSheetHairline,
  ScanSheetHeader,
} from './scan-sheet-chrome';

type ScanCodePickerSheetProps = {
  detections: ScanDetection[];
  onPick: (detection: ScanDetection) => void;
  onDismiss: () => void;
};

export const ScanCodePickerSheet = forwardRef<BottomSheetModal, ScanCodePickerSheetProps>(
  function ScanCodePickerSheet({ detections, onPick, onDismiss }, ref) {
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
        animationConfigs={scanSheetAnimationConfigs}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            ...sheet.compactContentStyle,
            paddingHorizontal: scanLayout.sheetPadX,
            gap: 0,
          }}
        >
          <ScanSheetHeader title="Multiple codes" meta="Choose which code to use" />
          <View style={{ height: 8 }} />

          {detections.map((detection, index) => (
            <View key={`${detection.symbology}:${detection.payload}`}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  onPick(detection);
                }}
                style={{ paddingVertical: 14, gap: 4 }}
              >
                <Text variant="caption" color="muted" style={{ fontWeight: '600', fontSize: 12 }}>
                  {symbologyLabel(detection.symbology)}
                </Text>
                <Text
                  variant="body"
                  style={{ fontSize: 16, fontWeight: '500', fontVariant: ['tabular-nums'] }}
                >
                  {formatScanPayloadPreview(detection.payload)}
                </Text>
              </Pressable>
              {index < detections.length - 1 ? <ScanSheetHairline /> : null}
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
