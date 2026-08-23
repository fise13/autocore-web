import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, tokens } from '@/theme';

const STEPS = [
  { id: 1, label: 'Client' },
  { id: 2, label: 'Lines' },
  { id: 3, label: 'Review' },
] as const;

const STEP_SUBTITLES: Record<number, string> = {
  1: "Who's this for?",
  2: 'What are you doing?',
  3: 'Check before you save',
};

/** Stable identities — inline `.duration()` each render restarts entering. */
const HEADER_ENTERING = FadeInDown.duration(duration.fast).easing(autocoreEase);
const TRAIL_ENTERING = FadeIn.duration(duration.fast).easing(autocoreEase);

type WizardStepHeaderProps = {
  title: string;
  step: number;
};

/** Apple Music–scale title + quiet step subtitle. */
export function WizardStepHeader({ title, step }: WizardStepHeaderProps) {
  const reducedMotion = useReducedMotion();
  const subtitle = STEP_SUBTITLES[step] ?? '';

  return (
    <Animated.View
      entering={reducedMotion ? undefined : HEADER_ENTERING}
      style={{ gap: tokens.space.micro, paddingBottom: tokens.space.micro }}
    >
      <Text
        variant="pageTitle"
        style={{
          fontSize: 32,
          lineHeight: 38,
          fontWeight: '700',
          letterSpacing: -0.9,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="body"
          color="muted"
          style={{ fontSize: 16, lineHeight: 21, letterSpacing: -0.2 }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

type WizardStepTrailProps = {
  step: number;
  onSelect: (step: number) => void;
};

/**
 * Music-like pill segment trail for wizard steps.
 *
 * Every step is reachable in both directions. The trail used to allow backward
 * jumps only, which made it a progress indicator wearing a control's clothes —
 * the reader had to keep pressing Next to move forward even when they knew
 * exactly which part they came to edit. Commit-time validation, not navigation,
 * is what keeps an incomplete order from being saved.
 */
export function WizardStepTrail({ step, onSelect }: WizardStepTrailProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : TRAIL_ENTERING}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.secondary,
        borderRadius: tokens.radius.full,
        padding: 3,
        gap: 2,
      }}
    >
      {STEPS.map((item) => {
        const active = step === item.id;
        const done = step > item.id;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onSelect(item.id);
            }}
            style={{
              flex: 1,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.full,
              backgroundColor: active ? colors.card : 'transparent',
              paddingHorizontal: tokens.space.inline,
            }}
          >
            <Text
              variant="subheadline"
              style={{
                fontSize: 13,
                fontWeight: active ? '600' : '500',
                color: active
                  ? colors.foreground
                  : done
                    ? colors.primary
                    : colors.mutedForeground,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

export { STEPS };
