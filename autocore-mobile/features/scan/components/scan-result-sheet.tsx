import { forwardRef, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
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
import { matchTypeLabel } from '@/lib/scan/map-resolve-result';

import { scanStatusLabel, scanStatusTone } from '../lib/status';
import type { ScanResult } from '../types';

type ScanResultSheetProps = {
  result: ScanResult | null;
  onOpen: () => void;
  onReceive: () => void;
  onReserve: () => void;
  onSearch: () => void;
  isReceiving?: boolean;
  onDismiss: () => void;
};

function ActionRow({
  label,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptics.light();
        onPress();
      }}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: primary ? colors.primary : colors.secondary,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        variant="caption"
        style={{
          fontWeight: '600',
          color: primary ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const ScanResultSheet = forwardRef<BottomSheetModal, ScanResultSheetProps>(function ScanResultSheet(
  { result, onOpen, onReceive, onReserve, onSearch, isReceiving, onDismiss },
  ref,
) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['54%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  if (!result) {
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
        <View style={{ minHeight: 1 }} />
      </BottomSheetModal>
    );
  }

  const statusVariant = result.status ? scanStatusTone[result.status] : 'secondary';
  const statusColor =
    statusVariant === 'success'
      ? colors.success
      : statusVariant === 'warning'
        ? colors.warning
        : statusVariant === 'destructive'
          ? colors.destructive
          : colors.mutedForeground;
  const matchLabel = matchTypeLabel(result.matchType);

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
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text variant="heading" style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>
            {result.title}
          </Text>
          {result.subtitle ? (
            <Text variant="body" color="muted" style={{ fontSize: 15 }}>
              {result.subtitle}
            </Text>
          ) : null}
          {matchLabel ? (
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {matchLabel}
              {result.confidence != null && result.confidence < 1
                ? ` · ${Math.round(result.confidence * 100)}%`
                : ''}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {result.shelf ? (
            <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
              Полка {result.shelf}
            </Text>
          ) : null}
          {result.status ? (
            <Text variant="caption" style={{ fontSize: 13, fontWeight: '600', color: statusColor }}>
              {scanStatusLabel[result.status]}
            </Text>
          ) : null}
          {result.price ? (
            <Text variant="body" style={{ fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatPrice(result.price)}
            </Text>
          ) : null}
        </View>

        {result.stockLevels && result.stockLevels.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
              Остатки по складам
            </Text>
            {result.stockLevels.map((level) => (
              <View
                key={level.warehouseId}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text variant="caption">{level.warehouseName}</Text>
                <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                  {level.available} доступно · {level.onHand} всего
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {result.aiReasoning ? (
          <Text variant="caption" color="muted">
            {result.aiReasoning}
          </Text>
        ) : null}

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionRow label="Открыть" primary onPress={onOpen} />
          <ActionRow
            label={isReceiving ? 'Приёмка…' : '+1 на склад'}
            disabled={isReceiving}
            onPress={onReceive}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionRow label="Резерв" onPress={onReserve} />
          <ActionRow label="Поиск" onPress={onSearch} />
        </View>
        {isReceiving ? <ActivityIndicator color={colors.primary} /> : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
