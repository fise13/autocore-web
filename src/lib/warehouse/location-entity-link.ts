/**
 * Canonical warehouse location identity for QR / labels / scan.
 * Always use location document id — display codes can change; ids do not.
 */

export const LOCATION_ENTITY_SCHEME = "autocore";
export const LOCATION_ENTITY_HOST = "loc";

/** `autocore://loc/{locationId}` */
export function buildLocationEntityLink(locationId: string): string {
  const id = locationId.trim();
  if (!id) throw new Error("locationId is required");
  return `${LOCATION_ENTITY_SCHEME}://${LOCATION_ENTITY_HOST}/${id}`;
}

const LOCATION_LINK_RE = /^autocore:\/\/(?:loc|location|s|shelf)\/([\w-]+)$/i;

export function parseLocationEntityLink(payload: string): string | null {
  const match = LOCATION_LINK_RE.exec(payload.trim());
  return match?.[1] ?? null;
}

export function isLocationEntityLink(payload: string): boolean {
  return parseLocationEntityLink(payload) != null;
}
