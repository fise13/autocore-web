import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { formatPrice } from '@/features/search/lib/format';

import type { ScanCandidate, ScanResult } from '../types';

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
      >
        <BottomSheetScrollView contentContainerStyle={{ ...sheet.compactContentStyle, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
              Выберите позицию
            </Text>
            {payload ? (
              <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
                {payload}
              </Text>
            ) : null}
            {result?.aiReasoning ? (
              <Text variant="caption" color="muted">
                {result.aiReasoning}
              </Text>
            ) : null}
          </View>

          {candidates.map((candidate) => (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                onPick(candidate);
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.secondary,
                padding: 14,
                gap: 4,
              }}
            >
              <Text variant="body" style={{ fontSize: 15, fontWeight: '600' }}>
                {candidate.name}
              </Text>
              <Text variant="caption" color="muted">
                {candidate.sku} · {candidate.reason}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {candidate.sellPrice != null ? (
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    {formatPrice(candidate.sellPrice)}
                  </Text>
                ) : (
                  <View />
                )}
                <Text variant="caption" color="muted">
                  Доступно {candidate.totalAvailable}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.light();
              onSearch();
            }}
            style={{
              minHeight: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption" style={{ fontWeight: '600' }}>
              Поиск вручную
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
