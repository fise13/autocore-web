import { HorizontalFilterBar } from '@/components/ui';

import type { SearchFilterId, SearchFilterOption } from '../types';

type SearchFiltersProps = {
  filters: SearchFilterOption[];
  activeFilter: SearchFilterId;
  onFilterChange: (filter: SearchFilterId) => void;
};

export function SearchFilters({ filters, activeFilter, onFilterChange }: SearchFiltersProps) {
  return (
    <HorizontalFilterBar
      options={filters.map((filter) => ({ value: filter.id, label: filter.label }))}
      value={activeFilter}
      onChange={onFilterChange}
    />
  );
}
