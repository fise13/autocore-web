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
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(duration.fast).easing(autocoreEase)
      }
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

/** Music-like pill segment trail for wizard steps. */
export function WizardStepTrail({ step, onSelect }: WizardStepTrailProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeIn.duration(duration.fast).easing(autocoreEase)
      }
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
        const canJump = item.id < step;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active, disabled: !canJump && !active }}
            disabled={!canJump && !active}
            onPress={() => {
              if (!canJump) return;
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
