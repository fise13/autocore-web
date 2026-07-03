import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { searchLayout } from '../layout';
import type { SearchResultGroup, SearchResultItem } from '../types';
import { SearchEngineCard } from './search-engine-card';
import { SearchEmptyState } from './search-empty-state';

type SearchResultsProps = {
  query: string;
  groups: SearchResultGroup[];
};

function ResultRow({ item, onPress }: { item: SearchResultItem; onPress?: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: searchLayout.pad,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text variant="caption" color="muted" style={{ fontSize: searchLayout.meta }}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
    </Pressable>
  );
}

function ResultGroup({
  group,
  index,
}: {
  group: SearchResultGroup;
  index: number;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entering = reduced
    ? undefined
    : FadeInUp.delay(index * 50)
        .duration(240)
        .springify()
        .damping(36)
        .stiffness(320);

  return (
    <Animated.View entering={entering} style={{ gap: 4 }}>
      <Text
        variant="caption"
        color="muted"
        style={{
          fontSize: searchLayout.label,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          paddingHorizontal: searchLayout.pad,
          paddingTop: index === 0 ? 4 : 12,
        }}
      >
        {group.title}
      </Text>

      {group.items.map((item, itemIndex) => {
        const isEngine = item.kind === 'engine';
        const showDivider = itemIndex < group.items.length - 1;

        if (isEngine) {
          return (
            <View key={item.id}>
              <View style={{ paddingHorizontal: searchLayout.pad, paddingVertical: 4 }}>
                <SearchEngineCard engine={item} />
              </View>
              {showDivider ? (
                <View
                  style={{
                    height: searchLayout.hairline,
                    backgroundColor: colors.border,
                    marginHorizontal: searchLayout.pad,
                  }}
                />
              ) : null}
            </View>
          );
        }

        return (
          <View key={item.id}>
            <ResultRow item={item} />
            {showDivider ? (
              <View
                style={{
                  height: searchLayout.hairline,
                  backgroundColor: colors.border,
                  marginLeft: searchLayout.pad,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );
}

export function SearchResults({ query, groups }: SearchResultsProps) {
  const reduced = useReducedMotion();

  if (groups.length === 0) {
    return <SearchEmptyState />;
  }

  const entering = reduced
    ? undefined
    : FadeInUp.duration(220).springify().damping(36).stiffness(320);
  const exiting = reduced ? undefined : FadeOut.duration(160);

  return (
    <Animated.View key={`${query}-${groups.length}`} entering={entering} exiting={exiting} style={{ gap: 8, paddingTop: 8 }}>
      {groups.map((group, index) => (
        <ResultGroup key={group.id} group={group} index={index} />
      ))}
    </Animated.View>
  );
}
