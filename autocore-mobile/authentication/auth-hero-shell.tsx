import { useEffect, useRef } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from 'react-native-keyboard-controller';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { spacing, spring } from '@/theme';

import { AUTH_HERO_BRAND_PAD_TOP, AuthBrandMark } from './auth-brand-mark';
import { AUTH_HERO_STACK_GAP } from './auth-button-metrics';
import { AuthHeroCar, HERO_DISPLAY_HEIGHT } from './auth-hero-car';
import { useAuthEnter } from './auth-motion';
import { takeLoginRiseHandoff } from './splash-handoff';

/** Brand → illustration / form title. */
const BRAND_TO_HERO = spacing[6]; // 24
/** Illustration → headline (tight — illustration is the focal point). */
const HERO_TO_HEADLINE = spacing[4]; // 16
/** Headline → controls. */
const HEADLINE_TO_ACTIONS = spacing[8]; // 32
/** Horizontal inset — roomier than default screen pad. */
const PAGE_PAD_X = spacing[6]; // 24
/** Gap between the docked email field and the keyboard accessory. */
const KEYBOARD_FIELD_GAP = spacing[4]; // 16

type AuthHeroShellProps = {
  tagline: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'landing' | 'form';
  compact?: boolean;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
};

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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isForm = variant === 'form';
  const fromRiseHandoff = useRef(takeLoginRiseHandoff()).current;
  const brand = useAuthEnter(fromRiseHandoff ? -1 : 0);
  const heading = useAuthEnter(isForm ? 120 : fromRiseHandoff ? 320 : 260);
  const actions = useAuthEnter(isForm ? 200 : fromRiseHandoff ? 470 : 420);
  const legal = useAuthEnter(isForm ? 280 : fromRiseHandoff ? 610 : 560);

  const landingScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!compact) return;
    const frame = requestAnimationFrame(() => {
      landingScrollRef.current?.scrollToEnd({ animated: !reducedMotion });
    });
    return () => cancelAnimationFrame(frame);
  }, [compact, reducedMotion]);

  const compactProgress = useDerivedValue(
    () =>
      reducedMotion
        ? compact
          ? 1
          : 0
        : withSpring(compact ? 1 : 0, {
            ...spring.settle,
            overshootClamping: true,
          }),
    [compact, reducedMotion],
  );

  const heroSizeStyle = useAnimatedStyle(() => ({
    height: interpolate(compactProgress.value, [0, 1], [HERO_DISPLAY_HEIGHT, 152]),
    transform: [
      { translateY: interpolate(compactProgress.value, [0, 1], [0, -22]) },
      { scale: interpolate(compactProgress.value, [0, 1], [1, 0.82]) },
    ],
  }));

  const body = (
    <>
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
        <Animated.View
          style={{
            alignItems: 'center',
            paddingTop: compact ? spacing[3] : BRAND_TO_HERO,
            overflow: 'hidden',
          }}
        >
          <Animated.View style={[{ alignItems: 'center' }, heroSizeStyle]}>
            <AuthHeroCar enterDelayMs={fromRiseHandoff ? 680 : 80} />
          </Animated.View>
          <Animated.View
            style={[
              {
                width: '100%',
                alignItems: 'center',
                paddingTop: compact ? spacing[2] : HERO_TO_HEADLINE,
                paddingBottom: compact ? spacing[4] : HEADLINE_TO_ACTIONS,
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
        </Animated.View>
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
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.primarySubtle, colors.background, colors.background]}
        locations={[0, 0.38, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {isForm ? (
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <KeyboardAwareScrollView
            bottomOffset={24}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'flex-start',
              paddingHorizontal: PAGE_PAD_X,
              paddingBottom: spacing[6],
            }}
          >
            <Pressable
              accessible={false}
              onPress={Keyboard.dismiss}
              style={{ flex: 1, width: '100%', maxWidth: 400, alignSelf: 'center' }}
            >
              {body}
            </Pressable>
          </KeyboardAwareScrollView>
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            ref={landingScrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={false}
            automaticallyAdjustContentInsets={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: compact ? 'flex-end' : 'flex-start',
              paddingTop: insets.top + AUTH_HERO_BRAND_PAD_TOP,
              paddingBottom: compact ? KEYBOARD_FIELD_GAP : insets.bottom,
              paddingHorizontal: PAGE_PAD_X,
            }}
          >
            <Pressable
              accessible={false}
              onPress={Keyboard.dismiss}
              style={{
                width: '100%',
                maxWidth: 400,
                alignSelf: 'center',
                flexGrow: compact ? 0 : 1,
              }}
            >
              {body}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
