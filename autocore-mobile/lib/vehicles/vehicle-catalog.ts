import catalog from './vehicle-catalog.json';

import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { uniqueAutocompleteOptions } from '@/lib/autocomplete/filter-options';

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

export function vehicleMakeOptions(extraMakes: string[] = []): AutocompleteOption[] {
  const catalogOptions = listVehicleMakes().map((name) => ({
    value: name,
    label: name,
    keywords: name,
  }));
  const extraOptions = extraMakes
    .filter(Boolean)
    .map((name) => ({ value: name, label: name, keywords: name }));
  return uniqueAutocompleteOptions([...catalogOptions, ...extraOptions]);
}

export function vehicleModelOptions(make: string, extraModels: string[] = []): AutocompleteOption[] {
  const catalogOptions = listVehicleModels(make).map((name) => ({
    value: name,
    label: name,
    keywords: `${make} ${name}`,
  }));
  const extraOptions = extraModels
    .filter(Boolean)
    .map((name) => ({ value: name, label: name, keywords: `${make} ${name}` }));
  return uniqueAutocompleteOptions([...catalogOptions, ...extraOptions]);
}
