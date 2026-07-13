/**
 * Mobile mirror of web location deeplink helper.
 * Keep in sync with src/lib/warehouse/location-entity-link.ts
 */

export function buildLocationEntityLink(locationId: string): string {
  const id = locationId.trim();
  if (!id) throw new Error('locationId is required');
  return `autocore://loc/${id}`;
}

const LOCATION_LINK_RE = /^autocore:\/\/(?:loc|location|s|shelf)\/([\w-]+)$/i;

export function parseLocationEntityLink(payload: string): string | null {
  const match = LOCATION_LINK_RE.exec(payload.trim());
  return match?.[1] ?? null;
}
