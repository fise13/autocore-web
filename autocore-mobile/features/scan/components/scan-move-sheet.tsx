import { forwardRef, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text, toast } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import {
  useMobileRelocate,
  useMobileWarehouseLocations,
  type MobileWarehouseLocation,
} from '@/hooks/use-mobile-relocate';
import { haptics } from '@/theme';

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
  /** Prefer scanning destination QR after closing this sheet. */
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
          reason: 'Перемещение со сканера',
        });
        haptics.success();
        toast({
          title: 'Перемещено',
          description: `${target.itemTitle} → ${result.toLocationCode}`,
          variant: 'success',
        });
        setDraft('');
        onMoved(result.toLocationCode);
      } catch (error) {
        toast({
          title: 'Не удалось переместить',
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
        <BottomSheetScrollView contentContainerStyle={{ ...sheet.compactContentStyle, gap: 14 }}>
          {!target ? (
            <View style={{ minHeight: 1 }} />
          ) : (
            <>
              <View style={{ gap: 4 }}>
                <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
                  Переместить
                </Text>
                <Text variant="caption" color="muted" numberOfLines={2}>
                  {target.itemTitle}
                  {target.shelf ? ` · сейчас ${target.shelf}` : ' · без места'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.selection();
                  onPreferScan?.();
                }}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Text
                  variant="body"
                  style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}
                >
                  Сканировать место
                </Text>
              </Pressable>

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Или введите код / выберите ниже"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={() => {
                  const code = draft.trim();
                  if (code) void moveTo({ displayCode: code });
                }}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  color: colors.foreground,
                  fontSize: 15,
                  fontWeight: '600',
                }}
              />

              {locationsQuery.isLoading ? (
                <ActivityIndicator color={colors.mutedForeground} />
              ) : options.length === 0 ? (
                <Text variant="caption" color="muted">
                  Мест пока нет — введите новый код и нажмите Return.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {options.map((location) => {
                    const busy = busyId === location.id;
                    return (
                      <Pressable
                        key={location.id}
                        accessibilityRole="button"
                        disabled={Boolean(busyId)}
                        onPress={() => {
                          haptics.light();
                          void moveTo(location);
                        }}
                        style={{
                          minHeight: 48,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          justifyContent: 'center',
                          backgroundColor: colors.secondary,
                          borderWidth: 1,
                          borderColor: colors.border,
                          opacity: busyId && !busy ? 0.5 : 1,
                        }}
                      >
                        {busy ? (
                          <ActivityIndicator color={colors.foreground} />
                        ) : (
                          <Text variant="body" style={{ fontSize: 15, fontWeight: '600' }}>
                            {location.displayCode}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.selection();
                  onCancel();
                }}
                style={{ alignItems: 'center', paddingVertical: 10 }}
              >
                <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
                  Отмена
                </Text>
              </Pressable>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
