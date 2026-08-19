import { forwardRef, useDeferredValue, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { CheckIcon, MapPinIcon } from '@/assets/icons';
import {
  CatalogRow,
  CatalogSectionHeader,
  SearchInput,
  Text,
  catalogRowPosition,
} from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { useMobileWarehouseLocations } from '@/hooks/use-mobile-relocate';
import {
  groupLocationsByZone,
  locationMatchesQuery,
  locationTypeLabel,
  zoneTitle,
} from '@/features/warehouse/lib/location-groups';
import { rhythm, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';

const GLYPH_SIZE = 40;

type Row =
  | { kind: 'zone'; key: string; title: string }
  | {
      kind: 'place';
      key: string;
      location: MobileWarehouseLocation;
      position: ReturnType<typeof catalogRowPosition>;
    };

type EngineLocationSheetProps = {
  warehouseId: string | null;
  currentLocationCode?: string | null;
  busyLocationId?: string | null;
  onSelect: (location: MobileWarehouseLocation) => void;
  onDismiss?: () => void;
};

function LocationGlyph({ selected }: { selected: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: GLYPH_SIZE,
        height: GLYPH_SIZE,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(selected ? colors.primary : colors.mutedForeground, 0.12),
      }}
    >
      <MapPinIcon
        size="sm"
        color={selected ? colors.primary : colors.mutedForeground}
        strokeWidth={1.85}
      />
    </View>
  );
}

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
        zone.locations.forEach((location, index) => {
          out.push({
            kind: 'place',
            key: `p:${location.id}`,
            location,
            position: catalogRowPosition(index, zone.locations.length),
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
          <Text variant="title3" numberOfLines={1}>
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
          renderItem={({ item }: { item: Row }) => {
            if (item.kind === 'zone') {
              return <CatalogSectionHeader title={item.title} />;
            }

            const code = item.location.displayCode || item.location.code;
            const selected =
              current != null && code.toUpperCase() === current;
            const busy = busyLocationId != null && busyLocationId !== item.location.id;

            return (
              <View style={{ opacity: busy ? 0.5 : 1 }}>
                <CatalogRow
                  position={item.position}
                  title={code}
                  monoTitle
                  subtitle={locationTypeLabel(item.location.type)}
                  leading={<LocationGlyph selected={selected} />}
                  leadingWidth={GLYPH_SIZE}
                  trailing={selected ? <CheckIcon size="sm" color={colors.primary} /> : undefined}
                  accessibilityLabel={`${code}, ${locationTypeLabel(item.location.type)}${
                    selected ? ', current' : ''
                  }`}
                  onPress={() => onSelect(item.location)}
                />
              </View>
            );
          }}
        />
      </BottomSheetModal>
    );
  },
);
