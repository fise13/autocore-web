/**
 * Warehouse location list shaping.
 *
 * Locations are a tree (zone → rack → shelf → bin) flattened into one
 * collection, so the list groups by the top of each `displayCode` path and
 * sinks the system leaves — `UNLOCATED` is a bucket, not a place anyone walks
 * to. Pure — no React, no network.
 */
// Relative, not `@/` — these run under the repo-root node test runner, where
// the `@/` alias points at the web app's src/.
import { joinSearchFields, matchesSearchQuery } from '../../../lib/search/match-query';
import type { MobileWarehouseLocation } from '../../../hooks/use-mobile-relocate';

export type LocationZone = {
  id: string;
  title: string;
  locations: MobileWarehouseLocation[];
};

const TYPE_LABELS: Record<string, string> = {
  zone: 'Zone',
  row: 'Row',
  rack: 'Rack',
  shelf: 'Shelf',
  bin: 'Bin',
  custom: 'Location',
};

export function locationTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? 'Location';
}

/** `A-03-2` → `A`. Locations with no separator group under themselves. */
export function locationZoneKey(location: MobileWarehouseLocation): string {
  const display = location.displayCode?.trim() || location.code?.trim() || '';
  const [head] = display.split('-');
  return (head || display || 'Other').toUpperCase();
}

export function locationMatchesQuery(
  location: MobileWarehouseLocation,
  query: string,
): boolean {
  return matchesSearchQuery(
    joinSearchFields(location.displayCode, location.code, locationTypeLabel(location.type)),
    query,
  );
}

function compareLocations(
  left: MobileWarehouseLocation,
  right: MobileWarehouseLocation,
): number {
  return (left.displayCode || left.code).localeCompare(right.displayCode || right.code, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * @param includeSystem when false, `UNLOCATED` and friends are dropped — they
 *   are holding pens for unplaced stock, surfaced by Receiving instead.
 */
export function groupLocationsByZone(
  locations: MobileWarehouseLocation[],
  includeSystem = false,
): LocationZone[] {
  const map = new Map<string, LocationZone>();

  for (const location of locations) {
    if (!includeSystem && location.isSystem) continue;
    const id = locationZoneKey(location);
    const existing = map.get(id);
    if (existing) {
      existing.locations.push(location);
      continue;
    }
    map.set(id, { id, title: id, locations: [location] });
  }

  const zones = Array.from(map.values());
  for (const zone of zones) zone.locations.sort(compareLocations);

  return zones.sort((left, right) =>
    left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

/**
 * A bare `A` makes a thin heading. Short keys are path segments and read as
 * zones; anything longer is already a name (`YARD`, `RETURNS`) and stands alone.
 */
export function zoneTitle(zone: LocationZone): string {
  return zone.id.length <= 2 ? `Zone ${zone.id}` : zone.id;
}

export function zoneSubtitle(zone: LocationZone): string {
  const total = zone.locations.length;
  const bins = zone.locations.filter((location) => location.type === 'bin').length;
  const places = `${total} ${total === 1 ? 'place' : 'places'}`;
  return bins > 0 ? `${places} · ${bins} ${bins === 1 ? 'bin' : 'bins'}` : places;
}
