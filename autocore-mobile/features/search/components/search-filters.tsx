import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { searchLayout } from '../layout';
import type { SearchFilterId, SearchFilterOption } from '../types';

type SearchFiltersProps = {
  filters: SearchFilterOption[];
  activeFilter: SearchFilterId;
  onFilterChange: (filter: SearchFilterId) => void;
};

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <View
        style={{
          height: searchLayout.filterHeight,
          paddingHorizontal: 16,
          borderRadius: searchLayout.filterHeight / 2,
          borderWidth: searchLayout.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.primary : colors.sidebarAccent,
          borderColor: selected ? colors.primary : colors.borderMuted,
        }}
      >
        <Text
          variant="caption"
          style={{
            fontSize: searchLayout.label,
            fontWeight: '600',
            color: selected ? colors.primaryForeground : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function SearchFilters({
  filters,
  activeFilter,
  onFilterChange,
}: SearchFiltersProps) {
  const scrollRef = useRef<ScrollView>(null);
  const chipWidth = searchLayout.filterHeight + 76;

  useEffect(() => {
    const index = filters.findIndex((filter) => filter.id === activeFilter);
    if (index > 2) {
      scrollRef.current?.scrollTo({ x: index * chipWidth, animated: true });
    }
  }, [activeFilter, chipWidth, filters]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          label={filter.label}
          selected={activeFilter === filter.id}
          onPress={() => onFilterChange(filter.id)}
        />
      ))}
    </ScrollView>
  );
}
