import type { SearchFilterOption } from '../types';

export const searchFilters: SearchFilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'parts', label: 'Inventory' },
  { id: 'motors', label: 'Motors' },
  { id: 'clients', label: 'Clients' },
  { id: 'orders', label: 'Orders' },
];
