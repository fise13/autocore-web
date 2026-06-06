import catalog from "@/lib/vehicles/vehicle-catalog.json";
import type { SearchOption } from "@/lib/search/filter-options";

type CatalogBrand = {
  name: string;
  models: string[];
};

const brands = catalog.brands as CatalogBrand[];

const brandByKey = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand]));

export function listVehicleMakes(): string[] {
  return brands.map((brand) => brand.name);
}

export function listVehicleModels(make: string): string[] {
  const brand = brandByKey.get(make.trim().toLowerCase());
  return brand?.models ?? [];
}

export function mergeSearchOptions(
  primary: SearchOption[],
  extra: SearchOption[],
  limit = 80,
): SearchOption[] {
  const seen = new Set<string>();
  const merged: SearchOption[] = [];

  for (const option of [...primary, ...extra]) {
    const key = option.value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
    if (merged.length >= limit) break;
  }

  return merged;
}

export function vehicleMakeOptions(extraMakes: string[] = []): SearchOption[] {
  const catalogOptions = listVehicleMakes().map((name) => ({
    value: name,
    label: name,
    keywords: name,
  }));

  const extraOptions = extraMakes
    .filter(Boolean)
    .map((name) => ({ value: name, label: name, keywords: name }));

  return mergeSearchOptions(catalogOptions, extraOptions);
}

export function vehicleModelOptions(make: string, extraModels: string[] = []): SearchOption[] {
  const catalogOptions = listVehicleModels(make).map((name) => ({
    value: name,
    label: name,
    keywords: `${make} ${name}`,
  }));

  const extraOptions = extraModels
    .filter(Boolean)
    .map((name) => ({ value: name, label: name, keywords: `${make} ${name}` }));

  return mergeSearchOptions(catalogOptions, extraOptions);
}
