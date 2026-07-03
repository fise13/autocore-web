import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Loading, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { searchTimeline, useSearchEnter } from '../animation';
import { searchLayout } from '../layout';
import type { QuickCategory, SearchEngine, SearchFilterId } from '../types';
import { SearchEngineCard } from './search-engine-card';

type SearchIdleProps = {
  recentQueries: string[];
  recentlyViewed: SearchEngine[];
  quickCategories: QuickCategory[];
  isBootstrapping?: boolean;
  hasData?: boolean;
  onRecentPress: (query: string) => void;
  onCategoryPress: (filter: SearchFilterId) => void;
};

function SectionTitle({ title, delay }: { title: string; delay: number }) {
  const style = useSearchEnter({ delay, translateY: 6, duration: 280 });

  return (
    <Animated.View style={style}>
      <Text variant="body" style={{ fontSize: searchLayout.sectionTitle, fontWeight: '600' }}>
        {title}
      </Text>
    </Animated.View>
  );
}

export function SearchIdle({
  recentQueries,
  recentlyViewed,
  quickCategories,
  isBootstrapping = false,
  hasData = false,
  onRecentPress,
  onCategoryPress,
}: SearchIdleProps) {
  const { colors } = useTheme();
  const recentStyle = useSearchEnter({ delay: searchTimeline.idleRecent, translateY: 10, spring: true });
  const viewedStyle = useSearchEnter({ delay: searchTimeline.idleViewed, translateY: 10, spring: true });
  const categoriesStyle = useSearchEnter({ delay: searchTimeline.idleCategories, translateY: 10, spring: true });

  if (isBootstrapping) {
    return (
      <View style={{ paddingHorizontal: searchLayout.pad, paddingTop: 24 }}>
        <Loading message="Загружаем каталог…" />
      </View>
    );
  }

  return (
    <View style={{ gap: searchLayout.section, paddingTop: 8 }}>
      {recentQueries.length > 0 ? (
        <Animated.View style={[{ gap: 10, paddingHorizontal: searchLayout.pad }, recentStyle]}>
          <SectionTitle title="Недавние запросы" delay={searchTimeline.idleRecent} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recentQueries.map((query) => (
              <Pressable
                key={query}
                accessibilityRole="button"
                onPress={() => {
                  haptics.selection();
                  onRecentPress(query);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.secondary,
                  borderWidth: searchLayout.hairline,
                  borderColor: colors.border,
                }}
              >
                <Text variant="caption" style={{ fontSize: searchLayout.label, fontWeight: '600' }}>
                  {query}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View style={[{ gap: 12 }, viewedStyle]}>
        <View style={{ paddingHorizontal: searchLayout.pad }}>
          <SectionTitle
            title={hasData ? 'Недавно обновлённые позиции' : 'Каталог пуст'}
            delay={searchTimeline.idleViewed}
          />
          {!hasData ? (
            <Text variant="caption" color="muted" style={{ marginTop: 6, lineHeight: 18 }}>
              На складе пока нет позиций. Добавьте товары через приёмку или импорт.
            </Text>
          ) : null}
        </View>
        {recentlyViewed.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: searchLayout.pad,
              gap: 10,
            }}
          >
            {recentlyViewed.map((engine) => (
              <View key={engine.id} style={{ width: 248 }}>
                <SearchEngineCard engine={engine} compact onPress={() => onRecentPress(engine.code)} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </Animated.View>

      <Animated.View style={[{ gap: 12, paddingHorizontal: searchLayout.pad }, categoriesStyle]}>
        <SectionTitle title="Быстрые категории" delay={searchTimeline.idleCategories} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quickCategories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                onCategoryPress(category.id);
              }}
              style={{
                width: '48%',
                minHeight: 52,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: searchLayout.radius,
                backgroundColor: colors.card,
                borderWidth: searchLayout.hairline,
                borderColor: colors.border,
                justifyContent: 'center',
              }}
            >
              <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
