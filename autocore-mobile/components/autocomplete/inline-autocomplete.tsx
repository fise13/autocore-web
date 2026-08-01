import { memo, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import {
  AUTOCOMPLETE_PANEL_RADIUS,
  AUTOCOMPLETE_ROW_HEIGHT,
  AUTOCOMPLETE_VISIBLE_ROWS,
} from '@/lib/autocomplete/constants';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { autocoreEase, duration } from '@/theme';

import { InlineAutocompleteRow } from './inline-autocomplete-row';

type InlineAutocompleteRenderArgs = {
  item: AutocompleteOption;
  index: number;
  highlighted: boolean;
  query: string;
  onPress: () => void;
};

export type InlineAutocompleteProps = {
  items: AutocompleteOption[];
  query: string;
  onSelect: (index: number) => void;
  renderItem?: (args: InlineAutocompleteRenderArgs) => React.ReactElement | null;
  loading?: boolean;
  emptyState?: React.ReactNode;
  highlightedIndex?: number;
  onHighlightChange?: (index: number) => void;
  visible?: boolean;
};

/** Apple-quality suggestion panel — floats above the keyboard, not a dropdown. */
export const InlineAutocomplete = memo(function InlineAutocomplete({
  items,
  query,
  onSelect,
  renderItem,
  loading = false,
  emptyState,
  highlightedIndex = 0,
  visible = true,
}: InlineAutocompleteProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const appear = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    appear.value = withTiming(visible ? 1 : 0, {
      duration: reducedMotion ? 1 : duration.fast,
      easing: autocoreEase,
    });
  }, [appear, reducedMotion, visible]);

  useEffect(() => {
    if (!visible || items.length === 0) return;
    const index = Math.max(0, Math.min(highlightedIndex, items.length - 1));
    const target = Math.max(0, (index - 1) * AUTOCOMPLETE_ROW_HEIGHT);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: target, animated: true });
    });
  }, [highlightedIndex, items.length, visible]);

  /** Ceiling only — the panel is free to be shorter than this. */
  const panelMaxHeight = AUTOCOMPLETE_VISIBLE_ROWS * AUTOCOMPLETE_ROW_HEIGHT;

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: (1 - appear.value) * -8 },
      { scaleY: 0.96 + appear.value * 0.04 },
    ],
  }));

  if (!visible) return null;

  const showEmpty = !loading && items.length === 0 && emptyState;
  if (!loading && items.length === 0 && !emptyState) return null;

  const body = (
    <View style={{ maxHeight: panelMaxHeight }}>
      {loading && items.length === 0 ? (
        <View
          style={{
            height: AUTOCOMPLETE_ROW_HEIGHT,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : showEmpty ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 16 }}>{emptyState}</View>
      ) : (
        <ScrollView
          ref={scrollRef}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={items.length > AUTOCOMPLETE_VISIBLE_ROWS}
        >
          {items.map((item, index) =>
            renderItem
              ? renderItem({
                  item,
                  index,
                  highlighted: index === highlightedIndex,
                  query,
                  onPress: () => onSelect(index),
                })
              : (
                  <InlineAutocompleteRow
                    key={`${item.value}-${index}`}
                    option={item}
                    query={query}
                    highlighted={index === highlightedIndex}
                    isLast={index === items.length - 1}
                    onPress={() => onSelect(index)}
                  />
                ),
          )}
        </ScrollView>
      )}
    </View>
  );

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.5 : 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  });

  const entering = reducedMotion ? undefined : FadeIn.duration(duration.fast).easing(autocoreEase);
  const exiting = reducedMotion
    ? undefined
    : FadeOut.duration(duration.instant).easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[
        fadeStyle,
        {
          borderRadius: AUTOCOMPLETE_PANEL_RADIUS,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          ...shadow,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 42 : 72}
          tint={isDark ? 'dark' : 'light'}
          style={{
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.86)' : 'rgba(255, 255, 255, 0.9)',
          }}
        >
          {body}
        </BlurView>
      ) : (
        <View style={{ backgroundColor: colors.card }}>{body}</View>
      )}
    </Animated.View>
  );
});

/** Lightweight empty copy for callers that want a default. */
export function InlineAutocompleteEmpty({ message = 'No matches' }: { message?: string }) {
  return (
    <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
      {message}
    </Text>
  );
}
