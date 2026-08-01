import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { useFadeIn } from '@/animations';
import { useTheme } from '@/hooks';
import { layout, rhythm, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { Screen } from './screen';
import { Text } from './text';

type ProductScreenShellProps = {
  children: ReactNode;
  /** Optional page title — Login form hierarchy (≤2–3 lines). */
  title?: string;
  subtitle?: string;
  /** Soft primary wash behind the first viewport (Login HeroBackdrop). */
  brandWash?: boolean;
  /** Fade-in content like AuthHeroShell actions. */
  animateEnter?: boolean;
  /** Trailing control aligned with the title row. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

function BrandWash() {
  const { colors, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[toneBackground(colors.primary, isDark ? 0.1 : 0.12), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
    </View>
  );
}

/**
 * Product hub chrome derived from Login `AuthHeroShell`:
 * optional brand wash, Login-weight title, rhythm padding, enter fade.
 */
export function ProductScreenShell({
  children,
  title,
  subtitle,
  brandWash = false,
  animateEnter = true,
  trailing,
  style,
  contentStyle,
}: ProductScreenShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const heading = useFadeIn(animateEnter ? 40 : 0);
  const body = useFadeIn(animateEnter ? 120 : 0);

  return (
    <Screen style={style}>
      {brandWash ? <BrandWash /> : null}
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

        <Animated.View style={[{ flex: 1 }, body.style]}>{children}</Animated.View>
      </View>
    </Screen>
  );
}
