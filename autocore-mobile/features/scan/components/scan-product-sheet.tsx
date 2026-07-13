import { forwardRef, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Easing } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { duration, haptics } from '@/theme';
import { formatPrice } from '@/features/search/lib/format';
import { matchTypeLabel } from '@/lib/scan/map-resolve-result';

import { scanStatusLabel, scanStatusTone } from '../lib/status';
import { ScanProductThumb } from './scan-product-thumb';
import type { ScanResult } from '../types';

type ScanProductSheetProps = {
  result: ScanResult | null;
  onSell: () => void;
  onEdit: () => void;
  onOpenCard: () => void;
  onAddToOrder?: () => void;
  onMove?: () => void;
  onClose: () => void;
  onDismiss: () => void;
};

function ActionButton({
  label,
  onPress,
  primary,
  compact,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  compact?: boolean;
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
        minHeight: compact ? 44 : 48,
        borderRadius: 14,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? colors.primary : colors.secondary,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        variant="body"
        style={{
          fontSize: compact ? 14 : 15,
          fontWeight: '600',
          color: primary ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const ScanProductSheet = forwardRef<BottomSheetModal, ScanProductSheetProps>(
  function ScanProductSheet(
    { result, onSell, onEdit, onOpenCard, onAddToOrder, onMove, onClose, onDismiss },
    ref,
  ) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet({ backdropOpacity: 0.42 });
    const animationConfigs = useMemo(
      () => ({
        duration: duration.fast,
        easing: Easing.out(Easing.cubic),
      }),
      [],
    );
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
      animationConfigs,
    };

    const statusVariant = result?.status ? scanStatusTone[result.status] : 'secondary';
    const statusColor =
      statusVariant === 'success'
        ? colors.success
        : statusVariant === 'warning'
          ? colors.warning
          : statusVariant === 'destructive'
            ? colors.destructive
            : colors.mutedForeground;
    const matchLabel = result ? matchTypeLabel(result.matchType) : null;
    const primaryStock = result?.stockLevels?.[0];
    const totalAvailable =
      primaryStock?.available ??
      result?.stockLevels?.reduce((sum, level) => sum + level.available, 0);

    // Single modal instance — early-return trees remount the portal and can leave a stuck backdrop.
    return (
      <BottomSheetModal ref={ref} {...modalProps} snapPoints={sheet.compactSnapPoints(result ? 52 : 48)}>
        {!result ? (
          <View style={{ minHeight: 1 }} />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={{ ...sheet.compactContentStyle, gap: 14, paddingTop: 4 }}
          >
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <ScanProductThumb name={result.title} imageUrl={result.imageUrl} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  variant="heading"
                  numberOfLines={2}
                  style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4, lineHeight: 24 }}
                >
                  {result.title}
                </Text>
                {result.subtitle ? (
                  <Text
                    variant="caption"
                    color="muted"
                    numberOfLines={1}
                    style={{ fontVariant: ['tabular-nums'], fontSize: 13 }}
                  >
                    {result.subtitle}
                  </Text>
                ) : null}
                {matchLabel ? (
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                    {matchLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: colors.secondary,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <StatCell
                label="Остаток"
                value={typeof totalAvailable === 'number' ? String(totalAvailable) : '—'}
              />
              <StatDivider />
              <StatCell label="Склад" value={primaryStock?.warehouseName ?? '—'} />
              <StatDivider />
              <StatCell label="Место" value={result.shelf?.trim() || 'Без места'} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {result.price ? (
                <View
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                    backgroundColor: `${colors.primary}12`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}28`,
                  }}
                >
                  <Text variant="caption" color="muted" style={{ fontSize: 10, fontWeight: '500' }}>
                    Цена
                  </Text>
                  <Text
                    variant="body"
                    style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: colors.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatPrice(result.price)}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {result.status ? (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: `${statusColor}18`,
                  }}
                >
                  <Text variant="caption" style={{ fontWeight: '700', color: statusColor, fontSize: 13 }}>
                    {scanStatusLabel[result.status]}
                  </Text>
                </View>
              ) : null}
            </View>

            {result.stockLevels && result.stockLevels.length > 1 ? (
              <View style={{ gap: 6 }}>
                {result.stockLevels.map((level) => (
                  <View
                    key={level.warehouseId}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text variant="caption" color="muted">
                      {level.warehouseName}
                    </Text>
                    <Text variant="caption" style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>
                      {level.available}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1.15 }}>
                  <ActionButton label="Продать" onPress={onSell} primary />
                </View>
                {onMove ? (
                  <View style={{ flex: 1 }}>
                    <ActionButton label="Переместить" onPress={onMove} />
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <ActionButton label="Изменить" onPress={onEdit} compact />
                </View>
                <View style={{ flex: 1 }}>
                  <ActionButton label="Карточка" onPress={onOpenCard} compact />
                </View>
              </View>

              {onAddToOrder ? (
                <ActionButton label="В заказ-наряд" onPress={onAddToOrder} compact />
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  onClose();
                }}
                style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="caption" color="muted" style={{ fontWeight: '600', fontSize: 14 }}>
                  Закрыть
                </Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);

function StatDivider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, backgroundColor: colors.border }} />;
}

function StatCell({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 2 }}>
      <Text
        variant="caption"
        color="muted"
        style={{ fontSize: 10, fontWeight: '500', textAlign: 'center' }}
      >
        {label}
      </Text>
      <Text
        variant="caption"
        numberOfLines={1}
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: colors.foreground,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
