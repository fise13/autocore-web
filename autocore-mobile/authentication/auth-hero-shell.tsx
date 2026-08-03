import { useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useFadeIn } from '@/animations';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { AUTH_HERO_BRAND_PAD_TOP, AuthBrandMark } from './auth-brand-mark';
import { AUTH_HERO_STACK_GAP } from './auth-button-metrics';
import { AuthHeroCar } from './auth-hero-car';
import { takeLoginRiseHandoff } from './splash-handoff';

/** Brand → illustration / form title. */
const BRAND_TO_HERO = spacing[6]; // 24
/** Illustration → headline (tight — illustration is the focal point). */
const HERO_TO_HEADLINE = spacing[4]; // 16
/** Headline → controls. */
const HEADLINE_TO_ACTIONS = spacing[8]; // 32
/** Horizontal inset — roomier than default screen pad. */
const PAGE_PAD_X = spacing[6]; // 24

type AuthHeroShellProps = {
  /** Headline under the animation (landing) or above the form (form). */
  tagline: string;
  /** Optional supporting line under the tagline. */
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * `landing` — car + tagline + controls (email entry).
   * `form` — same brand chrome without the car, for password / name / OAuth follow-up.
   */
  variant?: 'landing' | 'form';
  /**
   * Keyboard-focused landing — tighten hero chrome so brand + car stay on screen.
   */
  compact?: boolean;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
};

function HeroBackdrop() {
  const { colors, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[toneBackground(colors.primary, isDark ? 0.08 : 0.1), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
    </View>
  );
}

/**
 * Full-bleed auth chrome — Apple-first composition:
 * safe-area brand → hero illustration → two-line headline → controls → quiet footer.
 */
export function AuthHeroShell({
  tagline,
  description,
  children,
  footer,
  variant = 'landing',
  compact = false,
  onBack,
  backLabel = 'Back',
  backDisabled = false,
}: AuthHeroShellProps) {
  const { colors } = useTheme();
  const isForm = variant === 'form';
  // Cold-start rise: mark is already under the splash lockup — no second enter.
  const fromRiseHandoff = useRef(takeLoginRiseHandoff()).current;
  const brand = useFadeIn(fromRiseHandoff ? -1 : 0);
  // Rise exit ~1.2s — content settles in as the lockup finishes traveling.
  const heading = useFadeIn(isForm ? 120 : fromRiseHandoff ? 520 : 520);
  const actions = useFadeIn(isForm ? 200 : fromRiseHandoff ? 640 : 660);
  const legal = useFadeIn(isForm ? 280 : fromRiseHandoff ? 760 : 800);

  const brandToHero = compact ? spacing[3] : BRAND_TO_HERO;
  const heroToHeadline = compact ? spacing[2] : HERO_TO_HEADLINE;
  const headlineToActions = compact ? spacing[4] : HEADLINE_TO_ACTIONS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <HeroBackdrop />
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: PAGE_PAD_X,
            paddingTop: AUTH_HERO_BRAND_PAD_TOP,
            paddingBottom: compact ? spacing[3] : spacing[6],
          }}
        >
          <View style={{ flex: 1, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={backLabel}
                disabled={backDisabled}
                onPress={onBack}
                hitSlop={10}
                style={{
                  alignSelf: 'flex-start',
                  marginBottom: spacing[4],
                  opacity: backDisabled ? 0.45 : 1,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                <Text variant="body" style={{ fontSize: 17, fontWeight: '400', color: colors.primary }}>
                  {backLabel}
                </Text>
              </Pressable>
            ) : null}

            <Animated.View style={[{ alignItems: 'center' }, brand.style]}>
              <AuthBrandMark />
            </Animated.View>

            {isForm ? (
              <Animated.View
                style={[
                  {
                    paddingTop: spacing[8],
                    paddingBottom: spacing[6],
                    gap: spacing[2],
                    alignItems: 'center',
                  },
                  heading.style,
                ]}
              >
                <Text
                  variant="pageTitle"
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
                    fontSize: 28,
                    lineHeight: 34,
                    fontWeight: '700',
                    letterSpacing: -0.6,
                    textAlign: 'center',
                  }}
                >
                  {tagline}
                </Text>
                {description ? (
                  <Text
                    variant="pageSubtitle"
                    color="muted"
                    style={{ fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}
                  >
                    {description}
                  </Text>
                ) : null}
              </Animated.View>
            ) : (
              <View style={{ paddingTop: brandToHero, alignItems: 'center' }}>
                <AuthHeroCar />
                <Animated.View
                  style={[
                    {
                      paddingTop: heroToHeadline,
                      paddingBottom: headlineToActions,
                      width: '100%',
                      alignItems: 'center',
                    },
                    heading.style,
                  ]}
                >
                  <Text
                    variant="pageTitle"
                    style={{
                      fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
                      fontSize: compact ? 28 : 34,
                      lineHeight: compact ? 34 : 40,
                      fontWeight: '700',
                      letterSpacing: -0.9,
                      textAlign: 'center',
                      maxWidth: 320,
                    }}
                  >
                    {tagline}
                  </Text>
                </Animated.View>
              </View>
            )}

            <Animated.View style={[{ gap: AUTH_HERO_STACK_GAP, width: '100%' }, actions.style]}>
              {children}
            </Animated.View>

            {footer && !compact ? (
              <Animated.View
                style={[
                  {
                    paddingTop: isForm ? spacing[8] : spacing[6],
                    marginTop: 'auto',
                    opacity: 0.55,
                  },
                  legal.style,
                ]}
              >
                {footer}
              </Animated.View>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}
