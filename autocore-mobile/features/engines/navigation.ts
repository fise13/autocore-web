import type { Href } from 'expo-router';

/** Prefill for the add-engine composer — a scanned serial, a known variant. */
export type NewEnginePreset = {
  serial?: string;
  brand?: string;
  code?: string;
  location?: string;
};

export function newEngineHref(preset?: NewEnginePreset): Href {
  const params: Record<string, string> = {};
  if (preset?.serial) params.serial = preset.serial;
  if (preset?.brand) params.brand = preset.brand;
  if (preset?.code) params.code = preset.code;
  if (preset?.location) params.location = preset.location;

  return { pathname: '/objects/new', params } as Href;
}
