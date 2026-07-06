import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import {
  CarIcon,
  ClockIcon,
  FileTextIcon,
  PackageIcon,
  UserRoundIcon,
} from '@/assets/icons';
import { Loading, SectionHeader, Surface, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { searchTimeline, useSearchEnter } from '../animation';
import { searchLayout } from '../layout';
import type { QuickCategory, SearchEngine, SearchFilterId, SearchResultItem } from '../types';
import { SearchEngineCard } from './search-engine-card';

type SearchIdleProps = {
  recentQueries: string[];
  recentlyViewed: SearchEngine[];
  recentMotors?: SearchResultItem[];
  quickCategories: QuickCategory[];
  isBootstrapping?: boolean;
  hasData?: boolean;
  motorsEnabled?: boolean;
  onRecentPress: (query: string) => void;
  onCategoryPress: (filter: SearchFilterId) => void;
  onMotorPress?: (motorId: string) => void;
};

const CATEGORY_ICONS = {
  parts: PackageIcon,
  motors: CarIcon,
  clients: UserRoundIcon,
  orders: FileTextIcon,
} as const;

function AnimatedSection({
  children,
  delay,
  style,
}: {
  children: ReactNode;
  delay: number;
  style?: object;
}) {
  const enterStyle = useSearchEnter({ delay, translateY: 8, duration: 300, spring: true });
  return <Reanimated.View style={[enterStyle, style]}>{children}</Reanimated.View>;
}

export function SearchIdle({
  recentQueries,
  recentlyViewed,
  recentMotors = [],
  quickCategories,
  isBootstrapping = false,
  hasData = false,
  motorsEnabled = false,
  onRecentPress,
  onCategoryPress,
  onMotorPress,
}: SearchIdleProps) {
  const { colors } = useTheme();

  if (isBootstrapping && !hasData) {
    return (
      <View style={{ paddingHorizontal: searchLayout.pad, paddingTop: 24 }}>
        <Loading message="Загружаем каталог…" />
      </View>
    );
  }

  return (
    <View style={{ gap: searchLayout.section, paddingTop: rhythm.tight }}>
      {recentQueries.length > 0 ? (
        <AnimatedSection delay={searchTimeline.idleRecent}>
          <View style={{ paddingHorizontal: searchLayout.pad, gap: rhythm.inline }}>
            <SectionHeader title="Недавние запросы" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8 }}
            >
              {recentQueries.map((query) => (
                <Pressable
                  key={query}
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.selection();
                    onRecentPress(query);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 18,
                    backgroundColor: colors.card,
                    borderWidth: searchLayout.hairline,
                    borderColor: colors.border,
                  }}
                >
                  <ClockIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
                  <Text
                    variant="caption"
                    style={{ fontSize: searchLayout.label, fontWeight: '600', color: colors.foreground }}
                  >
                    {query}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={searchTimeline.idleViewed}>
        <View style={{ gap: rhythm.inline }}>
          <View style={{ paddingHorizontal: searchLayout.pad }}>
            <SectionHeader
              title={hasData ? 'Недавно просмотренные' : 'Каталог пуст'}
              actionLabel={hasData && recentlyViewed.length > 0 ? 'Склад' : undefined}
              onAction={
                hasData && recentlyViewed.length > 0
                  ? () => onCategoryPress('parts')
                  : undefined
              }
            />
            {!hasData ? (
              <Text variant="caption" color="muted" style={{ lineHeight: 18, marginTop: -4 }}>
                Добавьте товары через приёмку или импорт — они появятся здесь.
              </Text>
            ) : null}
          </View>
          {recentlyViewed.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: searchLayout.pad, gap: 10 }}
            >
              {recentlyViewed.map((engine, index) => (
                <View key={engine.id} style={{ width: 252 }}>
                  <SearchEngineCard
                    engine={engine}
                    compact
                    index={index}
                    onPress={() => onRecentPress(engine.code)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </AnimatedSection>

      {motorsEnabled && recentMotors.length > 0 ? (
        <AnimatedSection delay={searchTimeline.idleViewed + 40}>
          <View style={{ gap: rhythm.inline }}>
            <View style={{ paddingHorizontal: searchLayout.pad }}>
              <SectionHeader title="Доступные моторы" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: searchLayout.pad, gap: 10 }}
            >
              {recentMotors.map((motor, index) => (
                <View key={motor.id} style={{ width: 252 }}>
                  <SearchEngineCard
                    engine={motor}
                    compact
                    index={index}
                    onPress={() => {
                      haptics.selection();
                      onMotorPress?.(motor.subtitle ?? motor.title);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={searchTimeline.idleCategories} style={{ paddingHorizontal: searchLayout.pad }}>
        <SectionHeader title="Категории" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {quickCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS] ?? PackageIcon;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() => {
                  haptics.selection();
                  onCategoryPress(category.id);
                }}
                style={{ width: '48%' }}
              >
                <Surface compact style={{ minHeight: 64, justifyContent: 'center', backgroundColor: colors.card }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: toneBackground(colors.foreground, 0.05),
                      }}
                    >
                      <Icon size="sm" color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '600', flex: 1 }}>
                      {category.label}
                    </Text>
                  </View>
                </Surface>
              </Pressable>
            );
          })}
        </View>
      </AnimatedSection>
    </View>
  );
}
