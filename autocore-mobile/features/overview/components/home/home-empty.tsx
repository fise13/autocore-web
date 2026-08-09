import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useSession } from '@/hooks/use-session';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { HomeCard, HomeCardHeader, HomeSectionTitle } from './home-primitives';

export function HomeEmpty() {
  const { colors } = useTheme();
  const router = useRouter();
  const motors = useCompanyModuleEnabled('motors');
  const { can } = useSession();
  const canIntake = motors && can('engine_intake_view');

  return (
    <View style={{ gap: tokens.space[5] }}>
      <View>
        <HomeSectionTitle title="Now" />
        <HomeCard>
          <HomeCardHeader
            title="All clear"
            accent={colors.success}
            sf="checkmark.circle.fill"
            meta="Today"
            showChevron={false}
          />
          <Text
            style={{
              fontSize: 22,
              lineHeight: 28,
              fontWeight: '700',
              color: colors.foreground,
            }}
          >
            Nothing here yet
          </Text>
          <Text variant="footnote" color="muted">
            Your operation will summarize here as engines, orders, and inventory appear.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.medium();
              router.push((canIntake ? '/intake' : '/(tabs)/work') as Href);
            }}
            hitSlop={8}
            style={{ alignSelf: 'flex-start', paddingTop: tokens.space[1] }}
          >
            <Text variant="subheadline" style={{ color: colors.primary, fontWeight: '600' }}>
              {canIntake ? 'Receive first engine' : 'Open Work'}
            </Text>
          </Pressable>
        </HomeCard>
      </View>
    </View>
  );
}
