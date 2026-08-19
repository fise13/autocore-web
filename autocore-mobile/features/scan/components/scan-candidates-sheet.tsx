import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import { haptics } from '@/theme';

import { scanSheetAnimationConfigs } from '../animation/scan-sheet-motion';
import { scanLayout } from '../layout';
import type { ScanCandidate, ScanResult } from '../types';
import { ScanProductThumb } from './scan-product-thumb';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetPrimaryButton,
} from './scan-sheet-chrome';

type ScanCandidatesSheetProps = {
  result: ScanResult | null;
  payload: string | null;
  onPick: (candidate: ScanCandidate) => void;
  onSearch: () => void;
  onDismiss: () => void;
};

export const ScanCandidatesSheet = forwardRef<BottomSheetModal, ScanCandidatesSheetProps>(
  function ScanCandidatesSheet({ result, payload, onPick, onSearch, onDismiss }, ref) {
    const { colors } = useTheme();
    useMoneyFormatRevision();
    const sheet = useModalBottomSheet();
    const candidates = result?.candidates ?? [];

    return (
      <BottomSheetModal
        ref={ref}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.compactSnapPoints(52)}
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
            gap: 4,
          }}
        >
          <ScanSheetHeader
            title="Select an item"
            meta={
              [payload, result?.aiReasoning].filter(Boolean).join(' · ') || undefined
            }
          />

          <View style={{ height: 8 }} />

          {candidates.map((candidate, index) => (
            <View key={candidate.id}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  onPick(candidate);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                }}
              >
                <ScanProductThumb name={candidate.name} imageUrl={candidate.imageUrl} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" style={{ fontSize: 16, fontWeight: '500' }}>
                    {candidate.name}
                  </Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
                    {candidate.sku}
                    {candidate.reason ? ` · ${candidate.reason}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  {candidate.sellPrice != null ? (
                    <Text
                      variant="caption"
                      style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}
                    >
                      {formatPrice(candidate.sellPrice)}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                    {candidate.totalAvailable} in stock
                  </Text>
                </View>
              </Pressable>
              {index < candidates.length - 1 ? <ScanSheetHairline /> : null}
            </View>
          ))}

          <View style={{ height: 12 }} />
          <ScanSheetPrimaryButton label="Search manually" onPress={onSearch} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
