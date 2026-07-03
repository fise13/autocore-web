import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, layout } from '@/theme';
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
    const snapPoints = useMemo(() => ['52%'], []);
    const candidates = result?.candidates ?? [];

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: layout.bottomSheet.handleWidth }}
        backgroundStyle={{
          backgroundColor: colors.card,
          borderTopLeftRadius: layout.bottomSheet.borderRadius,
          borderTopRightRadius: layout.bottomSheet.borderRadius,
        }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
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
