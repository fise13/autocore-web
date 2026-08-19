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
import { haptics, rhythm, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';

import { EngineGlyph } from './engine-glyph';
import { eng, engType } from '../layout';

type Row =
  | { kind: 'zone'; key: string; title: string }
  | {
      kind: 'place';
      key: string;
      location: MobileWarehouseLocation;
    };

type EngineLocationSheetProps = {
  warehouseId: string | null;
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

  return (
    <View style={{ opacity: busy ? 0.5 : 1 }}>
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingHorizontal: eng.pad,
          paddingVertical: eng.stack,
          minHeight: 56,
          backgroundColor: pressed ? withAlpha(colors.muted, isDark ? 0.55 : 0.85) : 'transparent',
        }}
      >
        <EngineGlyph
          sf="mappin"
          fallback={MapPinIcon}
          size={16}
          color={selected ? colors.foreground : withAlpha(colors.mutedForeground, 0.85)}
          weight="medium"
        />

        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text variant="identifier" numberOfLines={1} style={{ color: colors.foreground }}>
            {location.displayCode || location.code}
          </Text>
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {locationTypeLabel(location.type)}
            {selected ? ', current' : ''}
          </Text>
        </View>

        {selected ? (
          <EngineGlyph sf="checkmark" fallback={CheckIcon} size={15} color={colors.foreground} weight="semibold" />
        ) : null}
      </Pressable>
      <View
        style={{
          height: eng.rule,
          marginLeft: eng.pad + 16 + spacing[3],
          backgroundColor: colors.border,
        }}
      />
    </View>
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
        zone.locations.forEach((location) => {
          out.push({
            kind: 'place',
            key: `p:${location.id}`,
            location,
          });
        });
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
          <Text variant="title3" numberOfLines={1} style={{ letterSpacing: -0.3 }}>
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
            paddingBottom: spacing[10],
          }}
          ListEmptyComponent={
            <View style={{ padding: spacing[6], alignItems: 'center' }}>
              <Text variant="footnote" color="muted">
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
                numberOfLines={1}
                style={{
                  ...engType.section,
                  marginTop: eng.block,
                  marginBottom: eng.inline,
                  paddingHorizontal: eng.pad,
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
