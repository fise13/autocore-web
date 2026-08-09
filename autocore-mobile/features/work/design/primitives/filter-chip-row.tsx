import { memo } from 'react';
import { ScrollView, Pressable, Text } from 'react-native';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type FilterChipOption = { id: string; label: string; count?: number };

export type FilterChipRowProps = {
  options: FilterChipOption[];
  value: string;
  onChange: (id: string) => void;
  scheme?: 'light' | 'dark';
};

export const FilterChipRow = memo(function FilterChipRow({
  options,
  value,
  onChange,
  scheme = 'light',
}: FilterChipRowProps) {
  const colors = workOsColors(scheme);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: workOsSpace.sm, paddingHorizontal: workOsSpace.screenX }}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: workOsRadius.pill,
              backgroundColor: active ? colors.chipActive : colors.chip,
            }}
          >
            <Text style={[workOsType.chip, { color: active ? colors.surface : colors.ink }]}>
              {opt.label}
              {typeof opt.count === 'number' ? ` · ${opt.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
