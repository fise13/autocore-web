import { forwardRef, useDeferredValue, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { CheckIcon, MapPinIcon } from '@/assets/icons';
import { SearchInput, Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { useMobileWarehouseLocations } from '@/hooks/use-mobile-relocate';
import {
  groupLocationsByZone,
  locationMatchesQuery,
  locationTypeLabel,
  zoneTitle,
} from '@/features/warehouse/lib/location-groups';
import { haptics, rhythm, spacing, tokens } from '@/theme';
import { toneBackground, withAlpha } from '@/theme/color-utils';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';

type Row =
  | { kind: 'zone'; key: string; title: string }
  | { kind: 'place'; key: string; location: MobileWarehouseLocation };

type EngineLocationSheetProps = {
  warehouseId: string | null;
  /** Highlights the shelf the engine already sits on. */
  currentLocationCode?: string | null;
  busyLocationId?: string | null;
  onSelect: (location: MobileWarehouseLocation) => void;
  onDismiss?: () => void;
};

function LocationPickRow({
  location,
  selected,
  busy,
  onPress,
}: {
  location: MobileWarehouseLocation;
  selected: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [pressed, setPressed] = useState(false);
  const isBin = location.type === 'bin';
  const tint = isBin ? colors.primary : colors.mutedForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, busy }}
      accessibilityLabel={`${location.displayCode || location.code}, ${locationTypeLabel(location.type)}`}
      disabled={busy}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      // Static style — `Pressable`'s function form is dropped by this RN version.
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2.5],
        borderRadius: tokens.radius.group,
        minHeight: 56,
        opacity: busy ? 0.5 : 1,
        backgroundColor: pressed ? withAlpha(colors.muted, isDark ? 0.55 : 0.85) : 'transparent',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: toneBackground(tint, isBin ? 0.14 : 0.1),
        }}
      >
        <MapPinIcon size="sm" color={tint} strokeWidth={1.85} />
      </View>

      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="identifier" numberOfLines={1} style={{ color: colors.foreground }}>
          {location.displayCode || location.code}
        </Text>
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {locationTypeLabel(location.type)}
          {selected ? ' · current' : ''}
        </Text>
      </View>

      {selected ? <CheckIcon size="sm" color={colors.primary} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

/**
 * Pick where an engine goes.
 *
 * Relocating used to hand the worker the barcode scanner, which only helps if
 * the shelf happens to be labelled and in reach. Someone at a desk moving an
 * engine on paper needs the list.
 */
export const EngineLocationSheet = forwardRef<BottomSheetModal, EngineLocationSheetProps>(
  function EngineLocationSheet(
    { warehouseId, currentLocationCode, busyLocationId, onSelect, onDismiss },
    ref,
  ) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet({ backdropOpacity: 0.4 });
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query.trim());

    const locationsQuery = useMobileWarehouseLocations(warehouseId, Boolean(warehouseId));

    const rows = useMemo<Row[]>(() => {
      const all = locationsQuery.data ?? [];
      const matched = deferredQuery
        ? all.filter((location) => locationMatchesQuery(location, deferredQuery))
        : all;
      const out: Row[] = [];
      for (const zone of groupLocationsByZone(matched)) {
        out.push({ kind: 'zone', key: `z:${zone.id}`, title: zoneTitle(zone) });
        for (const location of zone.locations) {
          out.push({ kind: 'place', key: `p:${location.id}`, location });
        }
      }
      return out;
    }, [deferredQuery, locationsQuery.data]);

    const current = currentLocationCode?.trim().toUpperCase() ?? null;

    return (
      <BottomSheetModal
        ref={ref}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={['72%']}
        enablePanDownToClose
        backdropComponent={sheet.renderBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <View style={{ paddingHorizontal: rhythm.pad, gap: spacing[3], paddingBottom: spacing[2] }}>
          <Text variant="heading" style={{ fontSize: 17, fontWeight: '700' }}>
            Move engine to
          </Text>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Zone, rack, shelf, or bin"
            accessibilityLabel="Search locations"
          />
        </View>

        <BottomSheetFlatList
          data={rows}
          keyExtractor={(row: Row) => row.key}
          contentContainerStyle={{
            paddingHorizontal: rhythm.pad - spacing[1],
            paddingBottom: spacing[10],
          }}
          ListEmptyComponent={
            <View style={{ padding: spacing[6], alignItems: 'center' }}>
              <Text variant="footnote" color="muted">
                {/* A disabled query stays `isPending`, so check the input first. */}
                {!warehouseId
                  ? 'No warehouse is set for this company'
                  : locationsQuery.isPending
                    ? 'Loading locations…'
                    : locationsQuery.isError
                      ? 'Locations could not be loaded'
                      : deferredQuery
                        ? 'No locations match'
                        : 'No locations mapped for this warehouse'}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Row }) =>
            item.kind === 'zone' ? (
              <Text
                variant="sectionLabel"
                color="muted"
                style={{
                  marginTop: spacing[4],
                  marginBottom: spacing[1],
                  marginHorizontal: spacing[3],
                }}
              >
                {item.title}
              </Text>
            ) : (
              <LocationPickRow
                location={item.location}
                selected={
                  current != null &&
                  (item.location.displayCode || item.location.code).toUpperCase() === current
                }
                busy={busyLocationId != null && busyLocationId !== item.location.id}
                onPress={() => onSelect(item.location)}
              />
            )
          }
        />
        <View style={{ height: 0, backgroundColor: colors.background }} />
      </BottomSheetModal>
    );
  },
);
