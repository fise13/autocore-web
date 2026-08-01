import { forwardRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';
import { matchTypeLabel } from '@/lib/scan/map-resolve-result';

import { scanStatusLabel, scanStatusTone } from '../lib/status';
import { scanLayout } from '../layout';
import type { ScanResult } from '../types';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetMetaRow,
  ScanSheetPrimaryButton,
  ScanSheetRow,
} from './scan-sheet-chrome';

type ScanResultSheetProps = {
  result: ScanResult | null;
  onOpen: () => void;
  onAddToOrder?: () => void;
  onReceive: () => void;
  onReserve: () => void;
  onSearch: () => void;
  isReceiving?: boolean;
  onDismiss: () => void;
};

export const ScanResultSheet = forwardRef<BottomSheetModal, ScanResultSheetProps>(
  function ScanResultSheet(
    { result, onOpen, onAddToOrder, onReceive, onReserve, onSearch, isReceiving, onDismiss },
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

    return (
      <BottomSheetModal ref={ref} {...modalProps} snapPoints={sheet.compactSnapPoints(54)}>
        {!result ? (
          <View style={{ minHeight: 1 }} />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={{
              ...sheet.compactContentStyle,
              paddingHorizontal: scanLayout.sheetPadX,
              gap: 12,
            }}
          >
            <ScanSheetHeader
              title={result.title}
              meta={
                [
                  result.subtitle,
                  matchLabel
                    ? `${matchLabel}${
                        result.confidence != null && result.confidence < 1
                          ? ` · ${Math.round(result.confidence * 100)}%`
                          : ''
                      }`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
            />

            {result.status ? (
              <Text variant="caption" style={{ fontWeight: '600', color: statusColor }}>
                {scanStatusLabel[result.status]}
              </Text>
            ) : null}

            <View>
              {result.shelf ? <ScanSheetMetaRow label="Shelf" value={result.shelf} /> : null}
              {result.price ? (
                <>
                  {result.shelf ? <ScanSheetHairline /> : null}
                  <ScanSheetMetaRow label="Price" value={formatPrice(result.price)} />
                </>
              ) : null}
            </View>

            {result.stockLevels && result.stockLevels.length > 0 ? (
              <View>
                {result.stockLevels.map((level, index) => (
                  <View key={level.warehouseId}>
                    <ScanSheetMetaRow
                      label={level.warehouseName}
                      value={`${level.available} available`}
                    />
                    {index < result.stockLevels!.length - 1 ? <ScanSheetHairline /> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {result.aiReasoning ? (
              <Text variant="caption" color="muted">
                {result.aiReasoning}
              </Text>
            ) : null}

            <View style={{ gap: 4 }}>
              {onAddToOrder ? (
                <ScanSheetPrimaryButton label="Add to order" onPress={onAddToOrder} />
              ) : (
                <ScanSheetPrimaryButton label="Open" onPress={onOpen} />
              )}
              {onAddToOrder ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetRow label="Open" onPress={onOpen} />
                </>
              ) : null}
              <ScanSheetHairline />
              <ScanSheetRow
                label={isReceiving ? 'Receiving…' : 'Add 1 to stock'}
                onPress={onReceive}
              />
              <ScanSheetHairline />
              <ScanSheetRow label="Reserve" onPress={onReserve} />
              <ScanSheetHairline />
              <ScanSheetRow label="Search" onPress={onSearch} />
            </View>

            {isReceiving ? <ActivityIndicator color={colors.primary} /> : null}
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);
