import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useFadeIn } from '@/animations';
import { useTheme } from '@/hooks';
import { rhythm, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { AuthHeroCar } from './auth-hero-car';

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
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
};

function HeroBackdrop() {
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

function BrandMark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
      <Image
        source={require('../assets/branding/login-logo.png')}
        style={{ width: 30, height: 30 }}
        resizeMode="contain"
        accessibilityLabel="AutoCore"
      />
      <Text
        variant="title"
        style={{ fontSize: 27, fontWeight: '700', letterSpacing: -0.6, lineHeight: 32 }}
      >
        AutoCore
      </Text>
    </View>
  );
}

/**
 * Full-bleed auth chrome — brand mark, optional hero, tagline, then controls.
 */
export function AuthHeroShell({
  tagline,
  description,
  children,
  footer,
  variant = 'landing',
  onBack,
  backLabel = 'Back',
  backDisabled = false,
}: AuthHeroShellProps) {
  const { colors } = useTheme();
  const isForm = variant === 'form';
  const brand = useFadeIn(0);
  const heading = useFadeIn(isForm ? 120 : 520);
  const actions = useFadeIn(isForm ? 200 : 660);
  const legal = useFadeIn(isForm ? 280 : 800);

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
            paddingHorizontal: rhythm.pad,
            paddingTop: spacing[4],
            paddingBottom: spacing[6],
          }}
        >
          <View style={{ flex: 1, width: '100%', maxWidth: 420, alignSelf: 'center' }}>
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
                <Text variant="body" style={{ fontSize: 16, fontWeight: '500', color: colors.primary }}>
                  {backLabel}
                </Text>
              </Pressable>
            ) : null}

            <Animated.View style={brand.style}>
              <BrandMark />
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
                    fontSize: 28,
                    lineHeight: 34,
                    fontWeight: '700',
                    letterSpacing: -0.7,
                    textAlign: 'center',
                  }}
                >
                  {tagline}
                </Text>
                {description ? (
                  <Text
                    variant="pageSubtitle"
                    color="muted"
                    style={{ fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 340 }}
                  >
                    {description}
                  </Text>
                ) : null}
              </Animated.View>
            ) : (
              <>
                <View style={{ flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center' }}>
                  <AuthHeroCar />
                </View>

                <Animated.View style={[{ paddingBottom: spacing[8] }, heading.style]}>
                  <Text
                    variant="pageTitle"
                    style={{
                      fontSize: 30,
                      lineHeight: 38,
                      fontWeight: '700',
                      letterSpacing: -0.8,
                      textAlign: 'center',
                    }}
                  >
                    {tagline}
                  </Text>
                </Animated.View>
              </>
            )}

            <Animated.View style={[{ gap: spacing[3], width: '100%' }, actions.style]}>
              {children}
            </Animated.View>

            {footer ? (
              <Animated.View
                style={[{ paddingTop: isForm ? spacing[6] : spacing[5], marginTop: isForm ? 'auto' : 0 }, legal.style]}
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
