import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloudIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { typography } from '@/theme';
import { tokens } from '@/theme/tokens';

import { home, homeFontCap } from './home-primitives';

type HomeHeaderProps = {
  organizationName: string;
  /** "Thursday, 20 August" */
  dateLabel: string;
  /**
   * One quiet line about the state of the data — offline, or showing the brief
   * saved from an earlier session. Null when what is on screen is live.
   */
  notice: string | null;
};

/**
 * The top of Home is orientation, not a toolbar.
 *
 * Date, then the company. No notification button, no range control, no filters:
 * a control belongs where its scope is legible, and nothing at the top of a
 * summary has a scope. What the reader gets instead is the one thing a header
 * can honestly give them — where they are, when, and whether they are looking
 * at live numbers.
 */
export const HomeHeader = memo(function HomeHeader({
  organizationName,
  dateLabel,
  notice,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[3],
        // The screen has to breathe before the first chapter starts.
        paddingBottom: tokens.space[6],
        paddingHorizontal: home.pad,
        gap: home.stack,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {dateLabel}
        </Text>
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={homeFontCap.hero}
          style={{ ...typography.largeTitle, color: colors.foreground }}
        >
          {organizationName}
        </Text>
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
