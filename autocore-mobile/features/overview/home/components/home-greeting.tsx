import { memo, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useFontScale, useReducedMotion } from '@/hooks/use-accessibility';
import { autocoreEase, duration, enterValues, typography } from '@/theme';

import { selectHomeGreeting, type HomeGreetingSignal } from '../lib/greeting';
import { home, homeFontCap } from './home-primitives';

/** The greeting is allowed two lines. A third turns the hero into a paragraph. */
const GREETING_LINES = 2;

/**
 * Average advance of SF Pro at display sizes, in ems, rounded up.
 *
 * Deliberately pessimistic: under-admitting a long line costs a shorter
 * greeting, over-admitting costs a visible ellipsis in 36pt type.
 */
const AVG_ADVANCE_EM = 0.55;

type HomeGreetingProps = {
  /**
   * The reader's clock, not the data's. Passed in rather than read here so the
   * line cannot change under a re-render.
   */
  now: Date;
  /** What the brief below is about to say. */
  signal: HomeGreetingSignal;
};

/**
 * The top line of Home.
 *
 * It used to be the company name set in 34pt bold, which answered a question
 * nobody opens their own workspace to ask. What a person actually arrives with
 * is the time of day and a rough sense of whether anything is on fire, so that
 * is what the line says — large, quiet, and in the reader's own register.
 *
 * The wording varies but never in front of the reader: `selectHomeGreeting` is
 * a hash of the local day and the part of day, so it is fixed for the whole
 * morning and moves on by itself in the afternoon.
 */
export const HomeGreeting = memo(function HomeGreeting({ now, signal }: HomeGreetingProps) {
  const { width } = useWindowDimensions();
  const fontScale = useFontScale();
  const reducedMotion = useReducedMotion();

  /**
   * How much line the greeting actually has, in characters.
   *
   * Long editorial lines drop out of the pool on a narrow iPhone — or on any
   * iPhone at accessibility text sizes — instead of wrapping to a third line or
   * being rescued by a second, smaller type scale.
   */
  const charBudget = useMemo(() => {
    const available = width - home.pad * 2;
    const renderedSize = typography.greeting.fontSize * Math.min(fontScale, homeFontCap.hero);
    const perLine = Math.floor(available / (renderedSize * AVG_ADVANCE_EM));
    return Math.max(perLine, 1) * GREETING_LINES;
  }, [fontScale, width]);

  const greeting = useMemo(
    () => selectHomeGreeting({ now, signal, charBudget }),
    [charBudget, now, signal],
  );

  const entering = reducedMotion
    ? undefined
    : FadeInDown.duration(duration.slow)
        .easing(autocoreEase)
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: enterValues.fadeInUp.translateY[0] }],
        });

  return (
    // Keyed on the seed so a period rollover fades the new line in rather than
    // swapping it mid-sentence.
    <Animated.View key={greeting.seed} entering={entering}>
      <Text
        variant="greeting"
        accessibilityRole="header"
        numberOfLines={GREETING_LINES}
        maxFontSizeMultiplier={homeFontCap.hero}
      >
        {greeting.text}
      </Text>
    </Animated.View>
  );
});
