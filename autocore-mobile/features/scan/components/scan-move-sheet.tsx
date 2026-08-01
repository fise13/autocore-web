import { forwardRef, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text, toast } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import {
  useMobileRelocate,
  useMobileWarehouseLocations,
  type MobileWarehouseLocation,
} from '@/hooks/use-mobile-relocate';
import { haptics } from '@/theme';

import { scanLayout } from '../layout';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetPrimaryButton,
  ScanSheetRow,
} from './scan-sheet-chrome';

export type ScanMoveTarget = {
  itemId: string;
  itemTitle: string;
  warehouseId: string;
  shelf?: string;
  quantity?: number;
};

type ScanMoveSheetProps = {
  target: ScanMoveTarget | null;
  onMoved: (toLocationCode: string) => void;
  onCancel: () => void;
  onDismiss: () => void;
  onPreferScan?: () => void;
};

export const ScanMoveSheet = forwardRef<BottomSheetModal, ScanMoveSheetProps>(
  function ScanMoveSheet({ target, onMoved, onCancel, onDismiss, onPreferScan }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const relocate = useMobileRelocate();
    const locationsQuery = useMobileWarehouseLocations(target?.warehouseId, Boolean(target));
    const [draft, setDraft] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
      setDraft('');
      setBusyId(null);
    }, [target?.itemId]);

    const options = useMemo(() => {
      const list = locationsQuery.data ?? [];
      const q = draft.trim().toLowerCase();
      const filtered = q
        ? list.filter(
            (location) =>
              location.displayCode.toLowerCase().includes(q) ||
              location.code.toLowerCase().includes(q),
          )
        : list;
      return filtered.filter((location) => !location.isSystem).slice(0, 40);
    }, [draft, locationsQuery.data]);

    async function moveTo(location: MobileWarehouseLocation | { displayCode: string; id?: string }) {
      if (!target) return;
      setBusyId(location.id ?? location.displayCode);
      try {
        const result = await relocate.mutateAsync({
          itemId: target.itemId,
          warehouseId: target.warehouseId,
          toLocationId: location.id,
          toLocationCode: location.id ? undefined : location.displayCode,
          quantity: target.quantity,
          reason: 'Moved from scanner',
        });
        haptics.success();
        toast({
          title: 'Moved',
          description: `${target.itemTitle} → ${result.toLocationCode}`,
          variant: 'success',
        });
        setDraft('');
        onMoved(result.toLocationCode);
      } catch (error) {
        toast({
          title: 'Could not move item',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setBusyId(null);
      }
    }

    return (
      <BottomSheetModal
        ref={ref}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.compactSnapPoints(64)}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={sheet.renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            ...sheet.compactContentStyle,
            paddingHorizontal: scanLayout.sheetPadX,
            gap: 12,
          }}
        >
          {!target ? (
            <View style={{ minHeight: 1 }} />
          ) : (
            <>
              <ScanSheetHeader
                title="Move"
                meta={`${target.itemTitle}${target.shelf ? ` · ${target.shelf}` : ''}`}
              />

              <ScanSheetPrimaryButton
                label="Scan location"
                onPress={() => onPreferScan?.()}
              />

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Or enter a location code"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={() => {
                  const code = draft.trim();
                  if (code) void moveTo({ displayCode: code });
                }}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  color: colors.foreground,
                  fontSize: 16,
                  fontWeight: '500',
                }}
              />

              {locationsQuery.isLoading ? (
                <ActivityIndicator color={colors.mutedForeground} />
              ) : options.length === 0 ? (
                <Text variant="caption" color="muted">
                  No locations yet — enter a code and press Return.
                </Text>
              ) : (
                <View>
                  {options.map((location, index) => {
                    const busy = busyId === location.id;
                    return (
                      <View key={location.id}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={Boolean(busyId)}
                          onPress={() => {
                            haptics.light();
                            void moveTo(location);
                          }}
                          style={{
                            minHeight: 48,
                            justifyContent: 'center',
                            opacity: busyId && !busy ? 0.45 : 1,
                          }}
                        >
                          {busy ? (
                            <ActivityIndicator color={colors.foreground} />
                          ) : (
                            <Text variant="body" style={{ fontSize: 16, fontWeight: '500' }}>
                              {location.displayCode}
                            </Text>
                          )}
                        </Pressable>
                        {index < options.length - 1 ? <ScanSheetHairline /> : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <ScanSheetHairline />
              <ScanSheetRow label="Cancel" onPress={onCancel} />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
