import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import type { HomeHealthCard } from '../../types-home';
import { resolveHomeAccent } from './home-accent';
import { HomeCard, HomeCardHeader, HomeSectionTitle } from './home-primitives';

/** Pinned-style operational health cards. */
export function HomeHealth({ cards }: { cards: HomeHealthCard[] }) {
  const { colors } = useTheme();
  const router = useRouter();

  if (cards.length === 0) return null;

  return (
    <View>
      <HomeSectionTitle title="Operational health" />
      <View style={{ gap: tokens.space[2.5] }}>
        {cards.map((card) => {
          const accent = resolveHomeAccent(colors, card.accent);
          return (
            <HomeCard
              key={card.id}
              onPress={
                card.href
                  ? () => {
                      haptics.selection();
                      router.push(card.href as Href);
                    }
                  : undefined
              }
              accessibilityLabel={card.title}
            >
              <HomeCardHeader
                title={card.title}
                accent={accent}
                sf={card.sf}
                meta={card.meta}
                showChevron={Boolean(card.href)}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: tokens.space[3],
                }}
              >
                <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 28,
                      lineHeight: 34,
                      fontWeight: '700',
                      letterSpacing: -0.45,
                      color: colors.foreground,
                    }}
                    numberOfLines={1}
                  >
                    {card.primary}
                  </Text>
                  {card.facts.map((fact) => (
                    <Text key={fact} variant="footnote" color="muted">
                      {fact}
                    </Text>
                  ))}
                </View>
              </View>
            </HomeCard>
          );
        })}
      </View>
    </View>
  );
}
