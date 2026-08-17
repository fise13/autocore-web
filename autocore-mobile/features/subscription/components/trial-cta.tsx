import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { describeTrialCta, type TrialOffer } from '@/lib/subscriptions/trial-policy';
import { haptics, radius, spacing, tokens } from '@/theme';

type TrialCtaProps = {
  trial: TrialOffer;
  /** Resolves false when the server refuses (already used, already Pro). */
  onStart: () => Promise<boolean>;
  disabled?: boolean;
};

/**
 * The free-trial button.
 *
 * Deliberately a separate, explicit action rather than something that happens
 * on sign-up: the trial is one per company and cannot be granted twice, so
 * starting it silently spends it for a user who may not have been ready to
 * evaluate anything. Nothing begins until this is pressed.
 *
 * Apple's introductory offer is not shown here — that one is applied by
 * StoreKit at purchase time, so advertising it as a separate button would
 * misstate the terms. `resolveTrialOffer` decides which of the two is on offer;
 * this renders only the internal one.
 */
export function TrialCta({ trial, onStart, disabled = false }: TrialCtaProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (trial.kind !== 'internal') return null;

  const label = describeTrialCta(trial) ?? `Start ${trial.days}-day free trial`;
  const inert = disabled || busy;

  const start = async () => {
    if (inert) return;
    setError(null);
    setBusy(true);
    haptics.medium();
    try {
      const started = await onStart();
      if (!started) {
        haptics.warning();
        setError('This workspace has already used its free trial.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing[1] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inert, busy }}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => void start()}
        // Static style — the `({ pressed }) => …` form is dropped by this RN
        // version, which would leave the button with no press feedback at all.
        style={{
          minHeight: tokens.control.heightLg,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          opacity: inert ? 0.6 : pressed ? 0.85 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Text variant="button" style={{ color: colors.foreground, fontWeight: '600' }}>
            {label}
          </Text>
        )}
      </Pressable>

      <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
        {error ?? 'No card required. Cancel any time.'}
      </Text>
    </View>
  );
}
