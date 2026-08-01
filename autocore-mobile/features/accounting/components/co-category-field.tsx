import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { PlusIcon, SearchIcon, XIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, radius, spacing } from '@/theme';

type CoCategoryFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Curated labels, most used first. */
  suggestions: string[];
  placeholder?: string;
  /** Let the pill row run to the edges of the surrounding card padding. */
  bleed?: number;
};

type PillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
};

function CategoryPill({ label, selected, onPress, leading }: PillProps) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.primary : colors.secondary, {
      duration: duration.fast,
      easing: autocoreEase,
    }),
  }));

  return (
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
            height: 38,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[1.5],
            paddingHorizontal: spacing[3.5],
            borderRadius: radius.full,
          },
          style,
        ]}
      >
        {leading}
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: selected ? colors.primaryForeground : colors.foreground,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Category picking without a dropdown: type to filter, or take one tap on a
 * pill. Anything not in the list can still be created inline, so the field
 * never blocks an unusual entry.
 */
export function CoCategoryField({
  value,
  onValueChange,
  suggestions,
  placeholder = 'Search or create a category',
  bleed = 0,
}: CoCategoryFieldProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const trimmedQuery = query.trim();

  const visible = useMemo(() => {
    if (!trimmedQuery) return suggestions;
    const lowered = trimmedQuery.toLowerCase();
    return suggestions.filter((item) => item.toLowerCase().includes(lowered));
  }, [suggestions, trimmedQuery]);

  const canCreate =
    trimmedQuery.length > 0 &&
    !suggestions.some((item) => item.toLowerCase() === trimmedQuery.toLowerCase());

  const clear = () => {
    setQuery('');
    onValueChange('');
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <View
        style={{
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingHorizontal: spacing[3.5],
          borderRadius: radius['2xl'],
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: focused ? colors.ring : 'transparent',
        }}
      >
        <SearchIcon size={17} color={colors.mutedForeground} strokeWidth={2} />
        <TextInput
          value={query || value}
          onChangeText={(next) => {
            setQuery(next);
            onValueChange(next);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Category"
          selectionColor={colors.primary}
          style={{ flex: 1, fontSize: 15, color: colors.foreground, padding: 0 }}
        />
        {value || query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear category" onPress={clear} hitSlop={8}>
            <XIcon size={16} color={colors.mutedForeground} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ marginHorizontal: -bleed }}
        contentContainerStyle={{ gap: spacing[2], paddingHorizontal: bleed }}
      >
        {canCreate ? (
          <Animated.View layout={LinearTransition.duration(duration.fast)}>
            <CategoryPill
              label={`Create "${trimmedQuery}"`}
              selected={false}
              leading={<PlusIcon size={15} color={colors.primary} strokeWidth={2.4} />}
              onPress={() => {
                onValueChange(trimmedQuery);
                setQuery('');
              }}
            />
          </Animated.View>
        ) : null}

        {visible.map((item) => (
          <Animated.View key={item} layout={LinearTransition.duration(duration.fast)}>
            <CategoryPill
              label={item}
              selected={item.toLowerCase() === value.trim().toLowerCase()}
              onPress={() => {
                onValueChange(item);
                setQuery('');
              }}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
