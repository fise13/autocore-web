import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import type { HomeAiInsight } from '../../types-home';
import { resolveHomeAccent } from './home-accent';
import { HomeCard, HomeCardHeader } from './home-primitives';

export function HomeAiInsightCard({ insight }: { insight: NonNullable<HomeAiInsight> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = resolveHomeAccent(colors, 'blue');

  return (
    <View>
      <HomeCard
        onPress={() => {
          haptics.selection();
          router.push(insight.href as Href);
        }}
        accessibilityLabel={`${insight.title}. ${insight.cta}`}
      >
        <HomeCardHeader title={insight.title} accent={accent} sf="sparkles" meta="AI" />
        <Text variant="callout" style={{ fontWeight: '500' }}>
          {insight.body}
        </Text>
        <Text
          variant="subheadline"
          style={{ color: colors.primary, fontWeight: '600', marginTop: tokens.space[1] }}
        >
          {insight.cta}
        </Text>
      </HomeCard>
    </View>
  );
}
