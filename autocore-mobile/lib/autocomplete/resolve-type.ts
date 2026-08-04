import type { AutocompleteSourceId, AutocompleteType } from './types';

/**
 * Maps the public `type` prop onto a registry `source` (+ optional fieldKey).
 * `type` wins when both `type` and `source` are provided.
 */
export function resolveAutocompleteType(
  type: AutocompleteType | undefined,
  source: AutocompleteSourceId | undefined,
  context?: Record<string, string>,
  fieldKey?: string,
): { source: AutocompleteSourceId; fieldKey?: string } {
  if (!type) {
    return { source: source ?? 'previousValue', fieldKey };
  }

  switch (type) {
    case 'customer':
      return { source: 'customer', fieldKey };
    case 'engine':
      return { source: 'engineCode', fieldKey: fieldKey ?? 'motorSerial' };
    case 'supplier':
      return { source: 'supplier', fieldKey };
    case 'employee':
      return { source: 'employee', fieldKey: fieldKey ?? 'assignee' };
    case 'vehicle': {
      const field = context?.field ?? fieldKey ?? 'make';
      if (field === 'licensePlate' || field === 'vin') {
        return {
          source: 'previousValue',
          fieldKey: fieldKey ?? field,
        };
      }
      // make / model / brand → manufacturer catalog
      return { source: 'manufacturer', fieldKey };
    }
    default:
      return { source: source ?? 'previousValue', fieldKey };
  }
}
