import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import { matchTypeLabel } from '@/lib/scan/map-resolve-result';
import { haptics } from '@/theme';

import { scanSheetAnimationConfigs } from '../animation/scan-sheet-motion';
import { scanStatusLabel, scanStatusTone } from '../lib/status';
import { scanLayout } from '../layout';
import type { ScanResult } from '../types';
import { ScanProductThumb } from './scan-product-thumb';
import {
  ScanSheetHairline,
  ScanSheetMetaRow,
  ScanSheetPrimaryButton,
  ScanSheetRow,
  ScanSheetTitle,
} from './scan-sheet-chrome';

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

export const ScanProductSheet = forwardRef<BottomSheetModal, ScanProductSheetProps>(
  function ScanProductSheet(
    { result, onSell, onEdit, onOpenCard, onAddToOrder, onMove, onClose, onDismiss },
    ref,
  ) {
    const { colors } = useTheme();
    useMoneyFormatRevision();
    const sheet = useModalBottomSheet({ backdropOpacity: 0.42 });
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
      animationConfigs: scanSheetAnimationConfigs,
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
    const metaLine = [
      result?.subtitle,
      matchLabel,
      result?.status ? scanStatusLabel[result.status] : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <BottomSheetModal ref={ref} {...modalProps} snapPoints={sheet.compactSnapPoints(result ? 54 : 40)}>
        {!result ? (
          <View style={{ minHeight: 1 }} />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={{
              ...sheet.compactContentStyle,
              paddingHorizontal: scanLayout.sheetPadX,
              gap: 16,
              paddingTop: scanLayout.sheetPadY,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <ScanProductThumb name={result.title} imageUrl={result.imageUrl} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <ScanSheetTitle>{result.title}</ScanSheetTitle>
                {metaLine ? (
                  <Text
                    variant="caption"
                    color="muted"
                    numberOfLines={2}
                    style={{ fontSize: 14, lineHeight: 18 }}
                  >
                    {metaLine}
                  </Text>
                ) : null}
                {result.status ? (
                  <Text
                    variant="caption"
                    style={{ fontSize: 12, fontWeight: '600', color: statusColor }}
                  >
                    {scanStatusLabel[result.status]}
                  </Text>
                ) : null}
              </View>
            </View>

            <View>
              <ScanSheetMetaRow
                label="In stock"
                value={typeof totalAvailable === 'number' ? String(totalAvailable) : '—'}
              />
              <ScanSheetHairline />
              <ScanSheetMetaRow label="Warehouse" value={primaryStock?.warehouseName ?? '—'} />
              <ScanSheetHairline />
              <ScanSheetMetaRow label="Location" value={result.shelf?.trim() || 'None'} />
              {result.price ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetMetaRow label="Price" value={formatPrice(result.price)} />
                </>
              ) : null}
            </View>

            {result.stockLevels && result.stockLevels.length > 1 ? (
              <View>
                {result.stockLevels.map((level, index) => (
                  <View key={level.warehouseId}>
                    <ScanSheetMetaRow
                      label={level.warehouseName}
                      value={String(level.available)}
                    />
                    {index < result.stockLevels!.length - 1 ? <ScanSheetHairline /> : null}
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 4 }}>
              <ScanSheetPrimaryButton label="Sell" onPress={onSell} />
              {onMove ? <ScanSheetRow label="Move" onPress={onMove} /> : null}
              {onAddToOrder ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetRow label="Add to work order" onPress={onAddToOrder} />
                </>
              ) : null}
              <ScanSheetHairline />
              <ScanSheetRow label="Open" onPress={onOpenCard} />
              <ScanSheetHairline />
              <ScanSheetRow label="Edit" onPress={onEdit} />
              <ScanSheetHairline />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  onClose();
                }}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="body" color="muted" style={{ fontSize: 16, fontWeight: '500' }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);
