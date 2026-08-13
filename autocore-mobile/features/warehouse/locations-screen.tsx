import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { MapPinIcon } from '@/assets/icons';
import {
  CatalogRow,
  CatalogScreenHeader,
  CatalogSectionHeader,
  ContentState,
  FlashList,
  Screen,
  ScreenGate,
  SearchInput,
  Text,
  catalogRowPosition,
  type CatalogRowPosition,
} from '@/components/ui';
import { useFloatingTabBarInset, useSession, useTheme } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useMobileWarehouseLocations } from '@/hooks/use-mobile-relocate';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { rhythm, spacing } from '@/theme';
import { toneBackground, withAlpha } from '@/theme/color-utils';
import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';
import type { WarehouseEntity } from '@/types/warehouse';

import {
  groupLocationsByZone,
  locationMatchesQuery,
  locationTypeLabel,
  zoneSubtitle,
  zoneTitle,
  type LocationZone,
} from './lib/location-groups';

const GLYPH_SIZE = 40;

type LocationRow =
  | { type: 'zone'; key: string; zone: LocationZone }
  | {
      type: 'place';
      key: string;
      location: MobileWarehouseLocation;
      position: CatalogRowPosition;
    };

function flattenZones(zones: LocationZone[]): LocationRow[] {
  const rows: LocationRow[] = [];
  for (const zone of zones) {
    rows.push({ type: 'zone', key: `z:${zone.id}`, zone });
    zone.locations.forEach((location, index) => {
      rows.push({
        type: 'place',
        key: `p:${location.id}`,
        location,
        position: catalogRowPosition(index, zone.locations.length),
      });
    });
  }
  return rows;
}

/**
 * Bins get the accent, structure nodes stay neutral — a bin is where stock
 * actually sits, everything above it is scaffolding.
 */
function LocationGlyph({ type }: { type: string }) {
  const { colors } = useTheme();
  const isBin = type === 'bin';
  const tint = isBin ? colors.primary : colors.mutedForeground;

  return (
    <View
      style={{
        width: GLYPH_SIZE,
        height: GLYPH_SIZE,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: toneBackground(tint, isBin ? 0.14 : 0.1),
      }}
    >
      <MapPinIcon size="sm" color={tint} strokeWidth={1.85} />
    </View>
  );
}

/**
 * Locations — the warehouse structure itself.
 *
 * Distinct from Stock, which lists what is *in* the warehouse. This is where a
 * person goes to find a shelf, check what sits on it, or count a zone.
 */
export function LocationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId } = useSession();
  const rbac = useRbacPolicy();
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const canView =
    warehouseEnabled && rbac.can('inventory_view') && rbac.scopes.inventory !== 'none';

  const warehouses = useSessionQueryData<WarehouseEntity[]>(
    ['realtime', 'warehouses', companyId],
    Boolean(companyId) && canView,
    [],
  );
  const warehouseId = useMemo(() => {
    const preferred = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
    return preferred?.id ?? null;
  }, [warehouses]);

  const locationsQuery = useMobileWarehouseLocations(warehouseId, canView && Boolean(warehouseId));
  const locations = locationsQuery.data;

  const { rows, placeCount, zoneCount } = useMemo(() => {
    const all = locations ?? [];
    const matched = deferredQuery
      ? all.filter((location) => locationMatchesQuery(location, deferredQuery))
      : all;
    const zones = groupLocationsByZone(matched);
    return {
      rows: flattenZones(zones),
      placeCount: zones.reduce((sum, zone) => sum + zone.locations.length, 0),
      zoneCount: zones.length,
    };
  }, [deferredQuery, locations]);

  const openLocation = useCallback(
    (locationId: string) => {
      router.push(`/warehouse/location/${locationId}` as Href);
    },
    [router],
  );

  if (!canView) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Locations"
        description="Your role cannot browse warehouse locations."
      />
    );
  }

  const loading = locationsQuery.isPending && Boolean(warehouseId);
  const subtitle = loading
    ? 'Loading locations…'
    : `${placeCount} ${placeCount === 1 ? 'place' : 'places'} · ${zoneCount} ${
        zoneCount === 1 ? 'zone' : 'zones'
      }`;

  return (
    <Screen>
      <CatalogScreenHeader
        title="Locations"
        subtitle={subtitle}
        onBack={() => goBackOrReplace(router, '/(tabs)/work' as Href)}
        search={
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Zone, rack, shelf, or bin"
            accessibilityLabel="Search locations"
          />
        }
      />

      {loading ? (
        <ContentState state="loading">{null}</ContentState>
      ) : locationsQuery.isError ? (
        <ContentState
          state="error"
          errorTitle="Locations unavailable"
          errorDescription={
            locationsQuery.error instanceof Error
              ? locationsQuery.error.message
              : 'The warehouse could not be reached.'
          }
          onRetry={() => void locationsQuery.refetch()}
        >
          {null}
        </ContentState>
      ) : rows.length === 0 ? (
        <ContentState
          state="empty"
          emptyIcon={MapPinIcon}
          emptyTitle={deferredQuery ? 'No locations match' : 'No locations yet'}
          emptyDescription={
            deferredQuery
              ? 'Try a zone letter, a rack, or a bin code.'
              : 'Create zones, racks and bins on the web to map this warehouse.'
          }
        >
          {null}
        </ContentState>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          contentContainerStyle={{
            paddingTop: spacing[1],
            paddingBottom: scrollBottom + rhythm.tabBarBreathing,
          }}
          renderItem={({ item }) =>
            item.type === 'zone' ? (
              <CatalogSectionHeader title={zoneTitle(item.zone)} meta={zoneSubtitle(item.zone)} />
            ) : (
              <CatalogRow
                position={item.position}
                title={item.location.displayCode || item.location.code}
                monoTitle
                subtitle={
                  <Text
                    variant="footnote"
                    numberOfLines={1}
                    style={{ color: withAlpha(colors.mutedForeground, 0.9) }}
                  >
                    {locationTypeLabel(item.location.type)}
                  </Text>
                }
                leading={<LocationGlyph type={item.location.type} />}
                leadingWidth={GLYPH_SIZE}
                accessibilityLabel={`${item.location.displayCode || item.location.code}, ${locationTypeLabel(
                  item.location.type,
                )}`}
                onPress={() => openLocation(item.location.id)}
              />
            )
          }
        />
      )}
    </Screen>
  );
}
