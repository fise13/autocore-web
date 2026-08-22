import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { useFadeIn } from '@/animations';
import { useTheme } from '@/hooks';
import { layout, rhythm, spacing } from '@/theme';

import { Screen } from './screen';
import { Text } from './text';

type ProductScreenShellProps = {
  children: ReactNode;
  /** Optional page title — Login form hierarchy (≤2–3 lines). */
  title?: string;
  subtitle?: string;
  /**
   * @deprecated Wash now lives on `Screen` (login-matched). Kept so call sites
   * keep typing; value is ignored.
   */
  brandWash?: boolean;
  /** Fade-in content like AuthHeroShell actions. */
  animateEnter?: boolean;
  /** Trailing control aligned with the title row. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Product hub chrome derived from Login `AuthHeroShell`:
 * login wash via `Screen`, Login-weight title, rhythm padding, enter fade.
 */
export function ProductScreenShell({
  children,
  title,
  subtitle,
  animateEnter = false,
  trailing,
  style,
  contentStyle,
}: ProductScreenShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const heading = useFadeIn(animateEnter ? 40 : -1);
  const body = useFadeIn(animateEnter ? 120 : -1);

  return (
    <Screen style={style}>
      <View
        style={[
          {
            flex: 1,
            paddingTop: title ? insets.top + rhythm.headerTop : 0,
          },
          contentStyle,
        ]}
      >
        {title ? (
          <Animated.View
            style={[
              {
                paddingHorizontal: layout.screenPad,
                paddingBottom: rhythm.headerBottom,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: rhythm.stack,
              },
              heading.style,
            ]}
          >
            <View style={{ flex: 1, gap: spacing[1], maxWidth: layout.contentMaxWidth }}>
              <Text
                variant="pageTitle"
                style={{
                  fontSize: layout.pageTitle,
                  lineHeight: layout.pageTitleLineHeight,
                  fontWeight: '700',
                  letterSpacing: -0.7,
                  color: colors.foreground,
                }}
                numberOfLines={3}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  variant="pageSubtitle"
                  color="muted"
                  style={{
                    fontSize: 16,
                    lineHeight: 22,
                    maxWidth: 340,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {trailing}
          </Animated.View>
        ) : null}

        {animateEnter ? (
          <Animated.View style={[{ flex: 1 }, body.style]}>{children}</Animated.View>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </View>
    </Screen>
  );
}
