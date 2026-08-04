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
import { Text } from '@/components/ui/text';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  AUTOCOMPLETE_APPEAR_MS,
  AUTOCOMPLETE_PANEL_RADIUS,
  AUTOCOMPLETE_ROW_HEIGHT,
  AUTOCOMPLETE_VISIBLE_ROWS,
} from '@/lib/autocomplete/constants';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { autocoreEase } from '@/theme';

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
  /** keyboardDock — sits above the keyboard; field — legacy under-input. */
  variant?: 'keyboardDock' | 'field';
};

/** Compact suggestion panel — keyboard-docked by default (QuickType / Music search). */
export const InlineAutocomplete = memo(function InlineAutocomplete({
  items,
  query,
  onSelect,
  renderItem,
  loading = false,
  emptyState,
  highlightedIndex = 0,
  visible = true,
  variant = 'keyboardDock',
}: InlineAutocompleteProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const appear = useSharedValue(visible ? 1 : 0);
  const docked = variant === 'keyboardDock';

  useEffect(() => {
    appear.value = withTiming(visible ? 1 : 0, {
      duration: reducedMotion ? 1 : AUTOCOMPLETE_APPEAR_MS,
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

  const rowCount =
    loading && items.length === 0
      ? 1
      : !loading && items.length === 0 && emptyState
        ? 1
        : Math.min(items.length, AUTOCOMPLETE_VISIBLE_ROWS);
  const panelHeight = Math.max(rowCount, 1) * AUTOCOMPLETE_ROW_HEIGHT;

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: docked
      ? [{ translateY: (1 - appear.value) * 8 }]
      : [{ scale: 0.98 + appear.value * 0.02 }],
  }));

  if (!visible) return null;

  const showEmpty = !loading && items.length === 0 && emptyState;
  if (!loading && items.length === 0 && !emptyState) return null;

  const body = (
    <View
      style={{
        height: panelHeight,
        maxHeight: AUTOCOMPLETE_VISIBLE_ROWS * AUTOCOMPLETE_ROW_HEIGHT,
      }}
    >
      {loading && items.length === 0 ? (
        <View
          style={{
            height: AUTOCOMPLETE_ROW_HEIGHT,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : showEmpty ? (
        <View
          style={{
            height: AUTOCOMPLETE_ROW_HEIGHT,
            paddingHorizontal: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {emptyState}
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={items.length > AUTOCOMPLETE_VISIBLE_ROWS}
        >
          {items.map((item, index) =>
            renderItem ? (
              renderItem({
                item,
                index,
                highlighted: index === highlightedIndex,
                query,
                onPress: () => onSelect(index),
              })
            ) : (
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
    ios: docked
      ? {
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.4 : 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        }
      : {
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
    android: { elevation: docked ? 6 : 4 },
    default: {},
  });

  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(AUTOCOMPLETE_APPEAR_MS).easing(autocoreEase);
  const exiting = reducedMotion
    ? undefined
    : FadeOut.duration(100).easing(autocoreEase);

  const surface = isDark ? 'rgba(28, 28, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)';

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
          intensity={isDark ? 52 : 70}
          tint={isDark ? 'dark' : 'light'}
          style={{ backgroundColor: surface }}
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
    <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 13 }}>
      {message}
    </Text>
  );
}
