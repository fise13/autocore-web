import { searchDomain } from '@autocore/domain-search';

import { ACCOUNTING_CATEGORY_SUGGESTIONS, operationCategoryLabel } from '@/lib/accounting/labels';
import { vehicleMakeOptions, vehicleModelOptions } from '@/lib/vehicles/vehicle-catalog';

import type { AutocompleteDataSnapshot } from './autocomplete-data-store';
import { AUTOCOMPLETE_MAX_SUGGESTIONS } from './constants';
import { filterAutocompleteOptions, uniqueAutocompleteOptions } from './filter-options';
import { readFieldValues, readRecentValues } from './recent-values-store';
import type { AutocompleteConfig, AutocompleteOption } from './types';

function toOptions(values: Iterable<string>, labelFn?: (value: string) => string): AutocompleteOption[] {
  const options: AutocompleteOption[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    options.push({ value: trimmed, label: labelFn?.(trimmed) ?? trimmed });
  }
  return options;
}

function searchEngineCodes(query: string, data: AutocompleteDataSnapshot): AutocompleteOption[] {
  const domain = searchDomain('engines', query, null, { limit: AUTOCOMPLETE_MAX_SUGGESTIONS });
  const motorCodes = data.motors
    .map((motor) => motor.engineCode?.trim())
    .filter((code): code is string => Boolean(code));

  const merged = uniqueAutocompleteOptions([
    ...domain.map((hit) => ({
      value: hit.entry.name,
      label: hit.entry.hint ? `${hit.entry.name} · ${hit.entry.hint}` : hit.entry.name,
      keywords: [hit.entry.brand, hit.entry.category, ...(hit.entry.aliases ?? [])]
        .filter(Boolean)
        .join(' '),
    })),
    ...toOptions(motorCodes),
  ]);

  return merged;
}

function searchManufacturers(query: string, data: AutocompleteDataSnapshot, context?: Record<string, string>): AutocompleteOption[] {
  const field = context?.field ?? 'brand';
  const make = context?.make?.trim() ?? '';

  if (field === 'model') {
    const models = vehicleModelOptions(make).map((option) => option.value);
    const vehicleModels = data.vehicles
      .filter((vehicle) => !make || vehicle.make.toLowerCase() === make.toLowerCase())
      .map((vehicle) => vehicle.model);
    return uniqueAutocompleteOptions([...toOptions(models), ...toOptions(vehicleModels)]);
  }

  const domain = searchDomain('brands', query, null, { limit: AUTOCOMPLETE_MAX_SUGGESTIONS });
  const inventoryBrands = data.inventory.map((item) => item.brandName?.trim()).filter(Boolean) as string[];
  const motorBrands = data.motors.map((motor) => motor.brandName?.trim()).filter(Boolean) as string[];
  const vehicleMakes = data.vehicles.map((vehicle) => vehicle.make);
  const catalogMakes = vehicleMakeOptions().map((option) => option.value);

  return uniqueAutocompleteOptions([
    ...domain.map((hit) => ({ value: hit.entry.name, label: hit.entry.name })),
    ...toOptions([...catalogMakes, ...vehicleMakes, ...inventoryBrands, ...motorBrands]),
  ]);
}

function searchCustomers(query: string, data: AutocompleteDataSnapshot, context?: Record<string, string>): AutocompleteOption[] {
  const field = context?.field ?? 'name';
  if (field === 'phone') {
    return uniqueAutocompleteOptions(
      data.clients.map((client) => ({
        value: client.phone,
        label: client.fullName ? `${client.phone} · ${client.fullName}` : client.phone,
        keywords: client.fullName,
      })),
    );
  }

  return uniqueAutocompleteOptions(
    data.clients.map((client) => ({
      value: client.fullName,
      label: client.phone ? `${client.fullName} · ${client.phone}` : client.fullName,
      keywords: client.phone,
    })),
  );
}

function searchSuppliers(query: string, data: AutocompleteDataSnapshot, companyId: string | null): AutocompleteOption[] {
  const counterparties = new Set<string>();
  for (const label of data.operationCategories) {
    if (label.trim()) counterparties.add(label.trim());
  }

  const recents = companyId ? readRecentValues(companyId, 'supplier') : [];
  return uniqueAutocompleteOptions([...toOptions(counterparties), ...toOptions(recents)]);
}

function searchWarehouses(data: AutocompleteDataSnapshot): AutocompleteOption[] {
  return uniqueAutocompleteOptions(
    data.warehouses.map((warehouse) => ({
      value: warehouse.name,
      label: warehouse.code ? `${warehouse.name} · ${warehouse.code}` : warehouse.name,
      keywords: warehouse.code,
    })),
  );
}

function searchCategories(data: AutocompleteDataSnapshot): AutocompleteOption[] {
  const specific = data.specificCategories.map((category) => ({
    value: category.name,
    label: category.name,
  }));
  const accounting = ACCOUNTING_CATEGORY_SUGGESTIONS.map((entry) => ({
    value: operationCategoryLabel(entry),
    label: operationCategoryLabel(entry),
    keywords: entry,
  }));
  const historic = toOptions(data.operationCategories);
  return uniqueAutocompleteOptions([...specific, ...accounting, ...historic]);
}

function searchPreviousValues(
  query: string,
  data: AutocompleteDataSnapshot,
  fieldKey?: string,
  context?: Record<string, string>,
): AutocompleteOption[] {
  const companyId = data.companyId;
  const field = fieldKey ?? context?.field ?? '';
  const stored = companyId && field ? readFieldValues(companyId, field) : [];

  const contextual: string[] = [];
  if (field === 'licensePlate') {
    contextual.push(...data.vehicles.map((vehicle) => vehicle.licensePlate));
  } else if (field === 'vin') {
    contextual.push(...data.vehicles.map((vehicle) => vehicle.vin).filter(Boolean) as string[]);
  } else if (field === 'warehouseLocation') {
    contextual.push(
      ...data.inventory.map((item) => item.warehouseLocation?.trim()).filter(Boolean) as string[],
    );
  } else if (field === 'assignee') {
    contextual.push(...data.employees.map((employee) => employee.fullName ?? employee.email ?? ''));
  } else if (field === 'partSku') {
    contextual.push(...data.inventory.map((item) => item.sku));
  } else if (field === 'partName') {
    contextual.push(...data.inventory.map((item) => item.name));
  } else if (field === 'motorSerial') {
    contextual.push(...data.motors.map((motor) => motor.serialCode));
  }

  return uniqueAutocompleteOptions([...toOptions(stored), ...toOptions(contextual)]);
}

function searchRecent(companyId: string | null, source: AutocompleteConfig['source']): AutocompleteOption[] {
  if (!companyId) return [];
  return toOptions(readRecentValues(companyId, source));
}

export function searchAutocomplete(
  query: string,
  config: AutocompleteConfig,
  data: AutocompleteDataSnapshot,
  customOptions?: AutocompleteOption[],
): AutocompleteOption[] {
  if (customOptions?.length) {
    return filterAutocompleteOptions(
      query,
      customOptions,
      config.matchMode ?? 'prefix',
      AUTOCOMPLETE_MAX_SUGGESTIONS,
    );
  }

  const minLen = config.minQueryLength ?? 0;
  if (query.trim().length < minLen && config.source !== 'recent') {
    return [];
  }

  let base: AutocompleteOption[] = [];

  switch (config.source) {
    case 'engineCode':
      base = searchEngineCodes(query, data);
      break;
    case 'manufacturer':
      base = searchManufacturers(query, data, config.context);
      break;
    case 'customer':
      base = searchCustomers(query, data, config.context);
      break;
    case 'supplier':
      base = searchSuppliers(query, data, data.companyId);
      break;
    case 'warehouse':
      base = searchWarehouses(data);
      break;
    case 'category':
      base = searchCategories(data);
      break;
    case 'previousValue':
      base = searchPreviousValues(query, data, config.fieldKey, config.context);
      break;
    case 'recent':
      base = searchRecent(data.companyId, config.source);
      break;
    default:
      base = [];
  }

  const recents =
    config.source !== 'recent' && data.companyId
      ? toOptions(readRecentValues(data.companyId, config.source))
      : [];

  const merged = uniqueAutocompleteOptions([...recents, ...base]);
  return filterAutocompleteOptions(query, merged, config.matchMode ?? 'prefix', AUTOCOMPLETE_MAX_SUGGESTIONS);
}
