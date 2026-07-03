import { useEffect, useRef } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { searchSpring, searchTimeline, useSearchEnter } from '../animation';
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
  index,
  onPress,
}: {
  label: string;
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  const enterStyle = useSearchEnter({
    delay: searchTimeline.filters + index * 48,
    translateY: 6,
    scaleFrom: 0.96,
    duration: 280,
    spring: true,
  });

  useEffect(() => {
    if (reduced) {
      progress.value = selected ? 1 : 0;
      return;
    }
    progress.value = withSpring(selected ? 1 : 0, searchSpring.focus);
  }, [progress, reduced, selected]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.secondary, colors.primary]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, colors.primary]),
    transform: [{ scale: 1 + progress.value * 0.03 }],
    opacity: 0.84 + progress.value * 0.16,
  }));

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        <Animated.View
          style={[
            {
              height: searchLayout.filterHeight,
              paddingHorizontal: 14,
              borderRadius: searchLayout.filterHeight / 2,
              borderWidth: searchLayout.hairline,
              alignItems: 'center',
              justifyContent: 'center',
            },
            chipStyle,
          ]}
        >
          <Text
            variant="caption"
            style={{
              fontSize: searchLayout.label,
              fontWeight: '600',
              color: selected ? colors.primaryForeground : colors.foreground,
            }}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function SearchFilters({
  filters,
  activeFilter,
  onFilterChange,
}: SearchFiltersProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const index = filters.findIndex((filter) => filter.id === activeFilter);
    if (index > 2) {
      scrollRef.current?.scrollTo({ x: index * 88, animated: true });
    }
  }, [activeFilter, filters]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: searchLayout.pad,
        gap: 8,
        paddingVertical: 2,
      }}
    >
      {filters.map((filter, index) => (
        <FilterChip
          key={filter.id}
          label={filter.label}
          selected={activeFilter === filter.id}
          index={index}
          onPress={() => onFilterChange(filter.id)}
        />
      ))}
    </ScrollView>
  );
}
