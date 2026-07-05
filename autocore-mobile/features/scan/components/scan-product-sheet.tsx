import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics } from '@/theme';
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
  onClose: () => void;
  onDismiss: () => void;
};

function ActionButton({
  label,
  onPress,
  primary,
  subtle,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  subtle?: boolean;
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
        minHeight: 48,
        borderRadius: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary
          ? colors.primary
          : subtle
            ? 'transparent'
            : colors.secondary,
        borderWidth: primary || subtle ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        variant="body"
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: primary ? colors.primaryForeground : colors.foreground,
          opacity: subtle ? 0.72 : 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const ScanProductSheet = forwardRef<BottomSheetModal, ScanProductSheetProps>(
  function ScanProductSheet(
    { result, onSell, onEdit, onOpenCard, onAddToOrder, onClose, onDismiss },
    ref,
  ) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
    };

    if (!result) {
      return (
        <BottomSheetModal ref={ref} {...modalProps} snapPoints={sheet.compactSnapPoints(58)}>
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
    const primaryStock = result.stockLevels?.[0];
    const totalAvailable =
      primaryStock?.available ??
      result.stockLevels?.reduce((sum, level) => sum + level.available, 0);

    return (
      <BottomSheetModal ref={ref} {...modalProps} snapPoints={sheet.compactSnapPoints(62)}>
        <BottomSheetScrollView contentContainerStyle={{ ...sheet.compactContentStyle, gap: 18 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <ScanProductThumb name={result.title} imageUrl={result.imageUrl} size={80} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="heading" style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.35 }}>
                {result.title}
              </Text>
              {result.subtitle ? (
                <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'], fontSize: 14 }}>
                  {result.subtitle}
                </Text>
              ) : null}
              {matchLabel ? (
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  {matchLabel}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {typeof totalAvailable === 'number' ? (
              <MetricPill label="Остаток" value={String(totalAvailable)} />
            ) : null}
            {primaryStock?.warehouseName ? (
              <MetricPill label="Склад" value={primaryStock.warehouseName} />
            ) : result.shelf ? (
              <MetricPill label="Ячейка" value={result.shelf} />
            ) : null}
            {result.price ? <MetricPill label="Цена" value={formatPrice(result.price)} accent /> : null}
            {result.status ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: `${statusColor}18`,
                }}
              >
                <Text variant="caption" style={{ fontWeight: '600', color: statusColor }}>
                  {scanStatusLabel[result.status]}
                </Text>
              </View>
            ) : null}
          </View>

          {result.stockLevels && result.stockLevels.length > 1 ? (
            <View style={{ gap: 8 }}>
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
                    {level.available} доступно
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <ActionButton label="Продать" onPress={onSell} primary />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <ActionButton label="Изменить товар" onPress={onEdit} />
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton label="Открыть карточку" onPress={onOpenCard} />
              </View>
            </View>
            {onAddToOrder ? (
              <ActionButton label="Добавить в заказ-наряд" onPress={onAddToOrder} />
            ) : null}
            <ActionButton label="Закрыть" onPress={onClose} subtle />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: accent ? `${colors.primary}12` : colors.secondary,
        borderWidth: 1,
        borderColor: accent ? `${colors.primary}28` : colors.border,
        gap: 2,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontSize: 10, fontWeight: '500' }}>
        {label}
      </Text>
      <Text
        variant="caption"
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: accent ? colors.primary : colors.foreground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
