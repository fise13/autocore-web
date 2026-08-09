import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import type { HomeNow } from '../../types-home';
import { resolveHomeAccent } from './home-accent';
import { HomeCard, HomeCardHeader, HomeSectionTitle } from './home-primitives';

export function HomeNowCard({ now }: { now: HomeNow }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = resolveHomeAccent(colors, now.kind === 'clear' ? 'green' : 'blue');

  const open = () => {
    haptics.selection();
    router.push(now.href as Href);
  };

  return (
    <View>
      <HomeSectionTitle title="Now" />
      <HomeCard onPress={open} accessibilityLabel={`${now.title}, ${now.cta}`}>
        <HomeCardHeader
          title={now.kind === 'intake' ? 'Engine intake' : now.kind === 'clear' ? 'All clear' : 'Active'}
          accent={accent}
          sf={now.kind === 'intake' ? 'camera.viewfinder' : now.kind === 'clear' ? 'checkmark.circle.fill' : 'bolt.fill'}
          meta={now.kind === 'intake' ? 'In progress' : 'Today'}
        />

        {now.kind === 'intake' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: tokens.space[3],
            }}
          >
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 34,
                  fontWeight: '700',
                  letterSpacing: -0.4,
                  color: colors.foreground,
                }}
                numberOfLines={1}
              >
                {now.serial}
              </Text>
              <Text variant="footnote" color="muted" numberOfLines={1}>
                {now.meta}
              </Text>
              <Text variant="caption1" color="muted">
                {[now.photosLabel, now.remainingLabel].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text variant="subheadline" style={{ color: colors.primary, fontWeight: '600' }}>
              {now.cta}
            </Text>
          </View>
        ) : null}

        {now.kind === 'summary' ? (
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontSize: 22,
                lineHeight: 28,
                fontWeight: '700',
                letterSpacing: -0.3,
                color: colors.foreground,
              }}
            >
              {now.title}
            </Text>
            {now.lines.map((line) => (
              <Text key={line} variant="footnote" color="muted">
                {line}
              </Text>
            ))}
            <Text
              variant="subheadline"
              style={{ color: colors.primary, fontWeight: '600', marginTop: 4 }}
            >
              {now.cta}
            </Text>
          </View>
        ) : null}

        {now.kind === 'clear' ? (
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontSize: 22,
                lineHeight: 28,
                fontWeight: '700',
                letterSpacing: -0.3,
                color: colors.foreground,
              }}
            >
              {now.title}
            </Text>
            <Text variant="footnote" color="muted">
              {now.detail}
            </Text>
          </View>
        ) : null}
      </HomeCard>
    </View>
  );
}
