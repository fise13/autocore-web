import { VpicVinFormatError } from "@/lib/nhtsa/errors";

/** ISO 3779: 17 chars, no I / O / Q (those are reserved to avoid digit confusion). */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidVin(raw: string): boolean {
  return VIN_RE.test(normalizeVin(raw));
}

export function assertValidVin(raw: string): string {
  const vin = normalizeVin(raw);
  if (!vin) {
    throw new VpicVinFormatError(raw, "empty");
  }
  if (vin.length !== 17) {
    throw new VpicVinFormatError(raw, `expected 17 characters, got ${vin.length}`);
  }
  const forbidden = vin.match(/[IOQ]/g);
  if (forbidden) {
    throw new VpicVinFormatError(raw, `contains forbidden letters ${[...new Set(forbidden)].join(", ")}`);
  }
  if (!VIN_RE.test(vin)) {
    throw new VpicVinFormatError(raw, "only A–H, J–N, P, R–Z and digits 0–9 are allowed");
  }
  return vin;
}
