import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloudIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import type { HomeGreetingSignal } from '../lib/greeting';
import { HomeGreeting } from './home-greeting';
import { home } from './home-primitives';

type HomeHeaderProps = {
  /** "Thursday, 20 August" */
  dateLabel: string;
  /** The reader's clock — see `HomeGreeting`. */
  now: Date;
  /** Whether the brief below has something waiting in it. */
  signal: HomeGreetingSignal;
  /**
   * One quiet line about the state of the data — offline, or showing the brief
   * saved from an earlier session. Null when what is on screen is live.
   */
  notice: string | null;
};

/**
 * The top of Home is orientation, not a toolbar.
 *
 * Date, then a greeting. No notification button, no range control, no filters:
 * a control belongs where its scope is legible, and nothing at the top of a
 * summary has a scope. What the reader gets instead is the one thing a header
 * can honestly give them — when they are, roughly how the day is going, and
 * whether they are looking at live numbers.
 *
 * The company name used to hold this slot. It was removed on purpose: a person
 * opening their own workspace already knows which business they run, and a
 * masthead spends the largest type on the screen saying so.
 */
export const HomeHeader = memo(function HomeHeader({
  dateLabel,
  now,
  signal,
  notice,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[3],
        // The hero is a chapter of its own, so it takes the screen's section
        // rhythm below it — HomeSection adds no top padding, which makes this
        // single value the whole greeting-to-Summary gap.
        paddingBottom: tokens.space.section,
        paddingHorizontal: home.pad,
        gap: home.stack,
      }}
    >
      <View style={{ gap: tokens.space.inline }}>
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {dateLabel}
        </Text>
        <HomeGreeting now={now} signal={signal} />
      </View>

      {notice ? (
        <View
          accessibilityRole="text"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: home.inline,
            alignSelf: 'flex-start',
            paddingHorizontal: tokens.space[2.5],
            paddingVertical: 5,
            borderRadius: tokens.radius.full,
            backgroundColor: colors.offlineSubtle,
          }}
        >
          <CloudIcon size={13} color={colors.offlineOnSubtle} strokeWidth={2} />
          <Text variant="caption1" style={{ color: colors.offlineOnSubtle }} numberOfLines={1}>
            {notice}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
